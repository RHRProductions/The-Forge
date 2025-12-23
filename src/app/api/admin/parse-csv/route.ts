import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import * as Papa from 'papaparse';
import { formatPhoneNumber, formatName, formatLocation } from '../../../../../lib/utils';
import { validateCSVFile } from '../../../../../lib/security/file-validator';
import { sanitizeLead } from '../../../../../lib/security/input-sanitizer';

// Column mapping for different vendor formats (same as leads/upload)
const COLUMN_MAPPINGS = {
  first_name: ['first_name', 'firstname', 'fname', 'given_name', 'FirstName'],
  last_name: ['last_name', 'lastname', 'lname', 'surname', 'family_name', 'LastName'],
  full_name: ['name', 'full_name', 'fullname', 'contact_name', 'lead_name', 'applicant_name'],
  email: ['email', 'email_address', 'e_mail', 'contact_email', 'email_combo', 'recent_email_1'],
  phone: ['phone', 'phone_number', 'phonenumber', 'primary_phone', 'home_phone', 'contact_phone', 'telephone', 'cell', 'other_phone_1', 'mobile', 'work', 'landline_cell_combo', 'cell_combo', 'cell_phone'],
  phone_2: ['phone_2', 'phone2', 'secondary_phone', 'work_phone', 'other_phone_2', 'home', 'landline', 'recent_landline_1', 'recent_cell_phone_1'],
  address: ['address', 'address1', 'addressline1', 'street_address', 'home_address', 'mailing_address'],
  city: ['city', 'town', 'municipality'],
  state: ['state', 'province', 'region', 'st'],
  zip_code: ['zip_code', 'zip', 'zipcode', 'postal_code', 'postcode', 'zip_plus_four'],
  age: ['age', 'est_age', 'estimated_age', 'current_age'],
  date_of_birth: ['date_of_birth', 'dob', 'birth_date', 'birthday', 'birth_month', 'date_of_birth'],
  income: ['income', 'est_income', 'estimated_income', 'annual_income', 'household_income'],
  gender: ['gender', 'sex'],
  marital_status: ['marital_status', 'marital', 'marriage_status'],
  occupation: ['occupation', 'job_title', 'profession', 'work'],
  company: ['company', 'employer', 'business'],
  household_size: ['household_size', 'family_size', 'hh_size'],
  status: ['status', 'lead_status', 'call_status'],
  contact_method: ['contact_method', 'preferred_contact', 'best_time'],
  notes: ['notes', 'comments', 'activity_log', 'description', 'remarks'],
  source: ['source', 'lead_source', 'campaign', 'vendor'],
  lead_score: ['lead_score', 'score', 'rating', 'quality'],
  cost_per_lead: ['cost_per_lead', 'cost', 'lead_cost'],
  sales_amount: ['sales_amount', 'sale_amount', 'revenue', 'value']
};

function findColumnValue(row: any, fieldMappings: string[]): string {
  for (const mapping of fieldMappings) {
    const value = row[mapping];
    if (value !== undefined && value !== null && value !== '') {
      return String(value).trim();
    }
  }
  return '';
}

function parseNameField(nameField: string): { firstName: string; lastName: string } {
  if (!nameField) return { firstName: '', lastName: '' };
  let cleanName = nameField.replace(/\([^)]*\)/g, '').trim();
  const parts = cleanName.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  } else if (parts.length >= 2) {
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  }
  return { firstName: '', lastName: '' };
}

function parseBirthDate(birthField: string): { dateOfBirth: string; calculatedAge: number | null } {
  if (!birthField) return { dateOfBirth: '', calculatedAge: null };

  let dateOfBirth = '';
  let calculatedAge = null;

  if (birthField.includes('-')) {
    const parts = birthField.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const day = parseInt(parts[2]);
      if (year > 1900 && year < 2030 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        dateOfBirth = `${month}/${day}/${year}`;
        const today = new Date();
        const birthDate = new Date(year, month - 1, day);
        calculatedAge = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          calculatedAge--;
        }
      }
    }
  } else if (birthField.includes('/')) {
    const parts = birthField.split('/');
    if (parts.length === 3) {
      const month = parseInt(parts[0]);
      const day = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      if (year > 1900 && year < 2030 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        dateOfBirth = `${month}/${day}/${year}`;
        const today = new Date();
        const birthDate = new Date(year, month - 1, day);
        calculatedAge = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          calculatedAge--;
        }
      }
    }
  }

  return { dateOfBirth, calculatedAge };
}

function detectLeadType(row: any, source: string, campaign: string = '', notes: string = ''): 't65' | 'life' | 'client' | 'other' {
  const leadTypeFromCSV = findColumnValue(row, ['lead_type', 'Lead Type', 'lead type', 'type', 'Type']) || '';
  const sourceStr = source.toLowerCase();
  const campaignStr = campaign.toLowerCase();
  const notesStr = notes.toLowerCase();
  const leadTypeStr = leadTypeFromCSV.toLowerCase();
  const allText = `${sourceStr} ${campaignStr} ${notesStr} ${leadTypeStr}`.toLowerCase();

  const t65Indicators = ['t65', 'turning 65', 'medicare', 'supplement', 'medigap', 'advantage', 'part d', 'partd', 'open enrollment', 'aep', 'annual enrollment', 'medicare annual'];
  const lifeIndicators = ['life', 'final expense', 'fe ', 'burial', 'funeral', 'whole life', 'term life', 'universal life', 'life insurance', 'death benefit', 'beneficiary'];
  const clientIndicators = ['client', 'customer', 'existing', 'current', 'sold', 'policy holder', 'policyholder', 'renew', 'renewal', 'service', 'claim', 'existing policy', 'current policy'];

  for (const indicator of t65Indicators) {
    if (allText.includes(indicator)) return 't65';
  }
  for (const indicator of lifeIndicators) {
    if (allText.includes(indicator)) return 'life';
  }
  for (const indicator of clientIndicators) {
    if (allText.includes(indicator)) return 'client';
  }

  const age = parseInt(findColumnValue(row, COLUMN_MAPPINGS.age)) || 0;
  if (age >= 64 && age <= 67) return 't65';

  return 'other';
}

interface ParsedLead {
  id: string; // temporary ID for tracking in UI
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  phone_2: string;
  company: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  date_of_birth: string;
  age: number | null;
  gender: string;
  marital_status: string;
  occupation: string;
  income: string;
  household_size: number | null;
  status: string;
  contact_method: string;
  lead_type: string;
  cost_per_lead: number;
  sales_amount: number;
  notes: string;
  source: string;
  lead_score: number;
  lead_temperature: string;
}

function parseCSVToLeads(results: any, costPerLead: number, vendorName: string, leadTemperature: string = 'cold'): ParsedLead[] {
  const leads: ParsedLead[] = [];

  for (let i = 0; i < results.data.length; i++) {
    const row = results.data[i] as any;

    try {
      // Extract name fields
      let firstName = findColumnValue(row, COLUMN_MAPPINGS.first_name);
      let lastName = findColumnValue(row, COLUMN_MAPPINGS.last_name);

      if (!firstName && !lastName) {
        const fullName = findColumnValue(row, COLUMN_MAPPINGS.full_name);
        if (fullName) {
          const parsedName = parseNameField(fullName);
          firstName = parsedName.firstName;
          lastName = parsedName.lastName;
        }
      }

      // Handle birth date and age
      let dateOfBirth = '';
      let birthCalculatedAge = null;

      const ageByMonth = findColumnValue(row, ['agebymonth', 'age_by_month', 'AgeByMonth']);
      const ageByYear = findColumnValue(row, ['agebyyear', 'age_by_year', 'AgeByYear']);

      if (ageByMonth && ageByYear) {
        const month = ageByMonth.padStart(2, '0');
        const year = ageByYear;
        dateOfBirth = `${month}/15/${year}`;
        const today = new Date();
        const birthDate = new Date(parseInt(year), parseInt(month) - 1, 15);
        birthCalculatedAge = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          birthCalculatedAge--;
        }
      } else {
        const birthDateField = findColumnValue(row, COLUMN_MAPPINGS.date_of_birth);
        const parsed = parseBirthDate(birthDateField);
        dateOfBirth = parsed.dateOfBirth;
        birthCalculatedAge = parsed.calculatedAge;
      }

      const ageField = findColumnValue(row, COLUMN_MAPPINGS.age);
      const finalAge = parseInt(ageField) || birthCalculatedAge || null;

      // Extract contact method
      let contactMethod = findColumnValue(row, COLUMN_MAPPINGS.contact_method);
      if (contactMethod) {
        contactMethod = contactMethod.toLowerCase();
        if (contactMethod.includes('morning') || contactMethod.includes('afternoon') || contactMethod.includes('evening')) {
          contactMethod = 'phone';
        }
      }

      // Extract notes
      let notes = findColumnValue(row, COLUMN_MAPPINGS.notes);
      if (notes) {
        notes = notes.replace(/https?:\/\/[^\s,]+/g, '').trim();
        notes = notes.replace(/\s+/g, ' ').trim();
      }

      const source = vendorName;
      const campaign = findColumnValue(row, ['campaign', 'Campaign']) || '';
      const leadType = detectLeadType(row, source, campaign, notes);

      const rawLead = {
        first_name: formatName(firstName),
        last_name: formatName(lastName),
        email: findColumnValue(row, COLUMN_MAPPINGS.email),
        phone: formatPhoneNumber(findColumnValue(row, COLUMN_MAPPINGS.phone)),
        phone_2: formatPhoneNumber(findColumnValue(row, COLUMN_MAPPINGS.phone_2)),
        company: findColumnValue(row, COLUMN_MAPPINGS.company),
        address: findColumnValue(row, COLUMN_MAPPINGS.address),
        city: formatLocation(findColumnValue(row, COLUMN_MAPPINGS.city)),
        state: formatLocation(findColumnValue(row, COLUMN_MAPPINGS.state)),
        zip_code: findColumnValue(row, COLUMN_MAPPINGS.zip_code),
        date_of_birth: dateOfBirth,
        age: finalAge,
        gender: findColumnValue(row, COLUMN_MAPPINGS.gender),
        marital_status: findColumnValue(row, COLUMN_MAPPINGS.marital_status),
        occupation: findColumnValue(row, COLUMN_MAPPINGS.occupation),
        income: findColumnValue(row, COLUMN_MAPPINGS.income),
        household_size: parseInt(findColumnValue(row, COLUMN_MAPPINGS.household_size)) || null,
        status: (findColumnValue(row, COLUMN_MAPPINGS.status) || 'new').toLowerCase(),
        contact_method: contactMethod,
        lead_type: leadType,
        cost_per_lead: costPerLead,
        sales_amount: parseFloat(findColumnValue(row, COLUMN_MAPPINGS.sales_amount)) || 0,
        notes: notes,
        source: source,
        lead_score: parseInt(findColumnValue(row, COLUMN_MAPPINGS.lead_score)) || 0,
        lead_temperature: leadTemperature,
      };

      const sanitizedLead = sanitizeLead(rawLead);

      leads.push({
        id: `temp-${i}`,
        ...sanitizedLead
      } as ParsedLead);
    } catch (error) {
      console.error('Error parsing row:', i, error);
    }
  }

  return leads;
}

// POST /api/admin/parse-csv - Parse CSV and return leads without saving
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can use this endpoint
    if ((session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const costPerLeadRaw = formData.get('costPerLead') as string;
    const costPerLead = parseFloat(costPerLeadRaw) || 0;
    const vendorName = (formData.get('vendorName') as string) || 'Unknown Vendor';
    const leadTemperature = (formData.get('leadTemperature') as string) || 'cold';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate CSV file
    const validation = await validateCSVFile(file);
    if (!validation.valid) {
      return NextResponse.json({
        error: validation.error || 'CSV file validation failed'
      }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split('\n');

    // Find the header line
    let headerLineIndex = -1;
    let actualHeaderLine = '';

    for (let i = 0; i < Math.min(20, lines.length); i++) {
      if (lines[i].includes('Name') && lines[i].includes('Phone Number')) {
        headerLineIndex = i;
        actualHeaderLine = lines[i];
        break;
      }
    }

    let results;

    if (headerLineIndex === -1) {
      const firstLine = lines[0];
      const hasHeaderRow = firstLine.toLowerCase().includes('first') ||
                          firstLine.toLowerCase().includes('name') ||
                          firstLine.toLowerCase().includes('email') ||
                          firstLine.toLowerCase().includes('phone');

      const firstLineFields = firstLine.split(',');
      const looksLikeLeadHeroData = firstLineFields.length > 20 &&
                                    /^\d{8}$/.test(firstLineFields[0].trim()) &&
                                    /^\d{2}\/\d{2}\/\d{4}$/.test(firstLineFields[1].trim());

      if (!hasHeaderRow && looksLikeLeadHeroData) {
        const leadHeroHeaders = 'Lead Id,Received Date,First Name,Last Name,Status,Lead Type,Lead Owner,Date Of Birth,Age,Email,Home,Phone 1,Phone 2,Mobile,Phone 4,Phone 5,Phone 6,Last Modified,Street Address,City,State,Zip,County,Lead Partner Notes,Assets Notes,Extra';
        const csvWithHeaders = leadHeroHeaders + '\n' + text;

        results = Papa.parse(csvWithHeaders, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.toLowerCase().replace(/\s+/g, '_'),
          quotes: true,
          quoteChar: '"',
          escapeChar: '"',
          fastMode: false
        });
      } else {
        results = Papa.parse(text, {
          header: hasHeaderRow,
          skipEmptyLines: true,
          transformHeader: (header) => header.toLowerCase().replace(/\s+/g, '_'),
          quotes: true,
          quoteChar: '"',
          escapeChar: '"',
          fastMode: false
        });
      }
    } else {
      const csvData = [actualHeaderLine, ...lines.slice(headerLineIndex + 1)]
        .filter(line => line.trim().length > 0)
        .join('\n');

      results = Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.toLowerCase().replace(/\s+/g, '_')
      });
    }

    // Filter out non-critical errors
    const criticalErrors = results.errors.filter((e: any) => e.code !== 'InvalidQuotes');
    if (criticalErrors.length > 0) {
      return NextResponse.json(
        { error: 'CSV parsing error', details: criticalErrors },
        { status: 400 }
      );
    }

    // Parse leads without saving to database
    const leads = parseCSVToLeads(results, costPerLead, vendorName, leadTemperature);

    return NextResponse.json({
      success: true,
      total: leads.length,
      leads
    });

  } catch (error) {
    console.error('Error parsing CSV:', error);
    return NextResponse.json(
      { error: 'Failed to parse CSV file' },
      { status: 500 }
    );
  }
}
