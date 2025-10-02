import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../lib/database/connection';
import { formatPhoneNumber, formatName, formatLocation } from '../../../../../lib/utils';
import * as Papa from 'papaparse';

// Column mapping for different vendor formats
const COLUMN_MAPPINGS = {
  // First Name variations
  first_name: ['first_name', 'firstname', 'fname', 'given_name'],

  // Last Name variations
  last_name: ['last_name', 'lastname', 'lname', 'surname', 'family_name'],
  
  // Name (when combined) - will need splitting
  full_name: ['name', 'full_name', 'fullname', 'contact_name', 'lead_name'],
  
  // Email variations
  email: ['email', 'email_address', 'e_mail', 'contact_email'],
  
  // Phone variations
  phone: ['phone', 'phone_number', 'primary_phone', 'home_phone', 'contact_phone', 'telephone', 'cell', 'other_phone_1', 'mobile', 'work'],
  phone_2: ['phone_2', 'phone2', 'secondary_phone', 'work_phone', 'other_phone_2', 'home'],
  
  // Address variations
  address: ['address', 'address1', 'addressline1', 'street_address', 'home_address', 'mailing_address'],
  city: ['city', 'town', 'municipality'],
  state: ['state', 'province', 'region', 'st'],
  zip_code: ['zip_code', 'zip', 'zipcode', 'postal_code', 'postcode'],
  
  // Age and DOB variations
  age: ['age', 'est_age', 'estimated_age', 'current_age'],
  date_of_birth: ['date_of_birth', 'dob', 'birth_date', 'birthday', 'birth_month', 'date_of_birth'],
  
  // Income variations
  income: ['income', 'est_income', 'estimated_income', 'annual_income', 'household_income'],
  
  // Other fields
  gender: ['gender', 'sex'],
  marital_status: ['marital_status', 'marital', 'marriage_status'],
  occupation: ['occupation', 'job_title', 'profession', 'work'],
  company: ['company', 'employer', 'business'],
  household_size: ['household_size', 'family_size', 'hh_size'],
  
  // Status and contact info
  status: ['status', 'lead_status', 'call_status'],
  contact_method: ['contact_method', 'preferred_contact', 'best_time'],
  notes: ['notes', 'comments', 'activity_log', 'description', 'remarks'],
  
  // Lead tracking
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
  
  // Handle names in parentheses or with extra info
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
  
  // Handle different birth date formats
  let dateOfBirth = '';
  let calculatedAge = null;
  
  // Check if it's a month/day/year format like "6/7/1959"
  if (birthField.includes('/')) {
    const parts = birthField.split('/');
    if (parts.length === 3) {
      const month = parseInt(parts[0]);
      const day = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      
      // Create proper date format
      if (year > 1900 && year < 2030 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        dateOfBirth = `${month}/${day}/${year}`;
        
        // Calculate age
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

function collectUnmappedData(row: any, usedKeys: Set<string>): string {
  const unmappedEntries: string[] = [];
  
  for (const [key, value] of Object.entries(row)) {
    if (!usedKeys.has(key) && value && String(value).trim() !== '') {
      // Clean the key for display
      const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const cleanValue = String(value).trim();
      
      // Skip URLs and very long values that might be noise
      if (!cleanValue.startsWith('http') && cleanValue.length < 500) {
        unmappedEntries.push(`${displayKey}: ${cleanValue}`);
      }
    }
  }
  
  return unmappedEntries.length > 0 ? unmappedEntries.join(' | ') : '';
}

function detectLeadType(row: any, source: string, campaign: string = '', notes: string = ''): 't65' | 'life' | 'client' | 'other' {
  // Convert to lowercase for case-insensitive matching
  const sourceStr = source.toLowerCase();
  const campaignStr = campaign.toLowerCase();
  const notesStr = notes.toLowerCase();
  const allText = `${sourceStr} ${campaignStr} ${notesStr}`.toLowerCase();
  
  // T65 (Medicare Turning 65) indicators
  const t65Indicators = [
    't65', 'turning 65', 'medicare', 'supplement', 'medigap', 
    'advantage', 'part d', 'partd', 'open enrollment',
    'aep', 'annual enrollment', 'medicare annual'
  ];
  
  // Life insurance indicators  
  const lifeIndicators = [
    'life', 'final expense', 'fe ', 'burial', 'funeral',
    'whole life', 'term life', 'universal life',
    'life insurance', 'death benefit', 'beneficiary'
  ];
  
  // Client indicators
  const clientIndicators = [
    'client', 'customer', 'existing', 'current', 'sold',
    'policy holder', 'policyholder', 'renew', 'renewal',
    'service', 'claim', 'existing policy', 'current policy'
  ];
  
  // Check for T65 indicators
  for (const indicator of t65Indicators) {
    if (allText.includes(indicator)) {
      return 't65';
    }
  }
  
  // Check for Life indicators
  for (const indicator of lifeIndicators) {
    if (allText.includes(indicator)) {
      return 'life';
    }
  }
  
  // Check for Client indicators
  for (const indicator of clientIndicators) {
    if (allText.includes(indicator)) {
      return 'client';
    }
  }
  
  // Age-based detection for T65 leads (approaching Medicare age)
  const age = parseInt(findColumnValue(row, COLUMN_MAPPINGS.age)) || 0;
  if (age >= 64 && age <= 67) {
    return 't65';
  }
  
  return 'other';
}

function processCSVData(results: any, totalSpent: number) {
  const db = getDatabase();
  const insertStmt = db.prepare(`
    INSERT INTO leads (
      first_name, last_name, email, phone, phone_2, company, 
      address, city, state, zip_code, date_of_birth, age, gender,
      marital_status, occupation, income, household_size, status, 
      contact_method, lead_type, cost_per_lead, sales_amount, notes, source, 
      lead_score, last_contact_date, next_follow_up, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  let successCount = 0;
  let errors = [];
  
  // Calculate cost per lead based on total spent
  const costPerLead = totalSpent > 0 && results.data.length > 0 ? totalSpent / results.data.length : 0;

  for (const row of results.data as any[]) {
    try {
      // Keep track of which columns we've used for mapping
      const usedKeys = new Set<string>();
      
      // Extract name fields - handle both separate and combined name fields
      let firstName = findColumnValue(row, COLUMN_MAPPINGS.first_name);
      let lastName = findColumnValue(row, COLUMN_MAPPINGS.last_name);
      
      // Track used keys
      COLUMN_MAPPINGS.first_name.forEach(key => { if (row[key] !== undefined) usedKeys.add(key); });
      COLUMN_MAPPINGS.last_name.forEach(key => { if (row[key] !== undefined) usedKeys.add(key); });
      
      // If no separate first/last names found, try to parse combined name field
      if (!firstName && !lastName) {
        const fullName = findColumnValue(row, COLUMN_MAPPINGS.full_name);
        if (fullName) {
          const parsedName = parseNameField(fullName);
          firstName = parsedName.firstName;
          lastName = parsedName.lastName;
          COLUMN_MAPPINGS.full_name.forEach(key => { if (row[key] !== undefined) usedKeys.add(key); });
        }
      }

      // Handle birth date and age
      const birthDateField = findColumnValue(row, COLUMN_MAPPINGS.date_of_birth);
      const { dateOfBirth, calculatedAge: birthCalculatedAge } = parseBirthDate(birthDateField);
      COLUMN_MAPPINGS.date_of_birth.forEach(key => { if (row[key] !== undefined) usedKeys.add(key); });
      
      // Use provided age or calculated age from birth date
      const ageField = findColumnValue(row, COLUMN_MAPPINGS.age);
      const finalAge = parseInt(ageField) || birthCalculatedAge || null;
      COLUMN_MAPPINGS.age.forEach(key => { if (row[key] !== undefined) usedKeys.add(key); });

      // Extract contact method and clean it up
      let contactMethod = findColumnValue(row, COLUMN_MAPPINGS.contact_method);
      if (contactMethod) {
        contactMethod = contactMethod.toLowerCase();
        // Map common variations to our standard values
        if (contactMethod.includes('morning') || contactMethod.includes('afternoon') || contactMethod.includes('evening')) {
          contactMethod = 'phone'; // Default to phone for time preferences
        }
      }
      COLUMN_MAPPINGS.contact_method.forEach(key => { if (row[key] !== undefined) usedKeys.add(key); });

      // Extract and clean notes (remove URLs and extra formatting)
      let notes = findColumnValue(row, COLUMN_MAPPINGS.notes);
      if (notes) {
        // Remove URLs from notes
        notes = notes.replace(/https?:\/\/[^\s,]+/g, '').trim();
        // Clean up extra whitespace
        notes = notes.replace(/\s+/g, ' ').trim();
      }
      COLUMN_MAPPINGS.notes.forEach(key => { if (row[key] !== undefined) usedKeys.add(key); });

      // Extract source field or use campaign
      const source = findColumnValue(row, COLUMN_MAPPINGS.source) || 'csv_upload';
      COLUMN_MAPPINGS.source.forEach(key => { if (row[key] !== undefined) usedKeys.add(key); });

      // Mark all other mapped fields as used
      Object.values(COLUMN_MAPPINGS).forEach(mappings => {
        mappings.forEach(key => {
          if (row[key] !== undefined) usedKeys.add(key);
        });
      });

      // Collect unmapped data and add to notes
      const unmappedData = collectUnmappedData(row, usedKeys);
      if (unmappedData) {
        notes = notes ? `${notes} | Additional Data: ${unmappedData}` : `Additional Data: ${unmappedData}`;
      }

      // Detect lead type based on source, campaign, notes, and age
      const campaign = findColumnValue(row, ['campaign', 'Campaign']) || '';
      const leadType = detectLeadType(row, source, campaign, notes);

      // Debug logging for first row
      if (successCount === 0) {
        console.log('Debug - Processing first lead:');
        console.log('firstName:', firstName);
        console.log('lastName:', lastName);
        console.log('phone:', findColumnValue(row, COLUMN_MAPPINGS.phone));
        console.log('email:', findColumnValue(row, COLUMN_MAPPINGS.email));
        console.log('address:', findColumnValue(row, COLUMN_MAPPINGS.address));
        console.log('city:', findColumnValue(row, COLUMN_MAPPINGS.city));
        console.log('state:', findColumnValue(row, COLUMN_MAPPINGS.state));
        console.log('zip:', findColumnValue(row, COLUMN_MAPPINGS.zip_code));
        console.log('age:', finalAge);
        console.log('lead type:', leadType);
        console.log('unmapped data:', unmappedData);
        console.log('final notes:', notes);
        console.log('Raw row keys:', Object.keys(row));
      }

      insertStmt.run(
        formatName(firstName),
        formatName(lastName), 
        findColumnValue(row, COLUMN_MAPPINGS.email),
        formatPhoneNumber(findColumnValue(row, COLUMN_MAPPINGS.phone)),
        formatPhoneNumber(findColumnValue(row, COLUMN_MAPPINGS.phone_2)),
        findColumnValue(row, COLUMN_MAPPINGS.company),
        findColumnValue(row, COLUMN_MAPPINGS.address),
        formatLocation(findColumnValue(row, COLUMN_MAPPINGS.city)),
        formatLocation(findColumnValue(row, COLUMN_MAPPINGS.state)),
        findColumnValue(row, COLUMN_MAPPINGS.zip_code),
        dateOfBirth,
        finalAge,
        findColumnValue(row, COLUMN_MAPPINGS.gender),
        findColumnValue(row, COLUMN_MAPPINGS.marital_status),
        findColumnValue(row, COLUMN_MAPPINGS.occupation),
        findColumnValue(row, COLUMN_MAPPINGS.income),
        parseInt(findColumnValue(row, COLUMN_MAPPINGS.household_size)) || null,
        findColumnValue(row, COLUMN_MAPPINGS.status) || 'new',
        contactMethod,
        leadType,
        parseFloat(findColumnValue(row, COLUMN_MAPPINGS.cost_per_lead)) || costPerLead,
        parseFloat(findColumnValue(row, COLUMN_MAPPINGS.sales_amount)) || 0,
        notes,
        source,
        parseInt(findColumnValue(row, COLUMN_MAPPINGS.lead_score)) || 0,
        findColumnValue(row, ['last_contact_date', 'got_on']),
        findColumnValue(row, ['next_follow_up'])
      );
      successCount++;
    } catch (error) {
      errors.push({ row, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  return {
    message: `Successfully imported ${successCount} leads`,
    total: results.data.length,
    successCount,
    costPerLead,
    totalSpent,
    errors: errors.length > 0 ? errors : undefined
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const totalSpent = parseFloat(formData.get('totalSpent') as string) || 0;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split('\n');
    
    // Debug: Check the structure of the file
    console.log('=== CSV FILE ANALYSIS ===');
    console.log('Total lines:', lines.length);
    console.log('First 15 lines:');
    lines.slice(0, 15).forEach((line, i) => {
      console.log(`Line ${i + 1}: "${line.substring(0, 100)}${line.length > 100 ? '...' : ''}"`);
    });
    
    // Find the header line (look for line containing "Name" and "Phone Number")
    let headerLineIndex = -1;
    let actualHeaderLine = '';
    
    for (let i = 0; i < Math.min(20, lines.length); i++) {
      if (lines[i].includes('Name') && lines[i].includes('Phone Number')) {
        headerLineIndex = i;
        actualHeaderLine = lines[i];
        break;
      }
    }
    
    if (headerLineIndex === -1) {
      // Fallback: try standard parsing for normal CSV files
      const results = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.toLowerCase().replace(/\s+/g, '_'),
        quotes: true,
        quoteChar: '"',
        escapeChar: '"',
        skipFirstNLines: 0,
        fastMode: false
      });
      
      // Filter out quote errors - we'll handle malformed quotes
      const criticalErrors = results.errors.filter(e => e.code !== 'InvalidQuotes');

      if (criticalErrors.length > 0) {
        console.error('CSV Parsing Errors:', JSON.stringify(criticalErrors, null, 2));
        return NextResponse.json(
          { error: 'CSV parsing error', details: criticalErrors },
          { status: 400 }
        );
      }

      if (results.errors.length > 0) {
        console.log('Non-critical CSV warnings (InvalidQuotes):', results.errors.length, 'warnings ignored');
      }
      
      console.log('Using standard CSV parsing - Headers:', results.meta?.fields);
      
      // Use existing parsing logic for standard CSVs
      const response = processCSVData(results, totalSpent);
      return NextResponse.json(response);
    }
    
    // Lead Hero format detected - extract data starting from header line
    console.log('Lead Hero format detected. Header line index:', headerLineIndex);
    console.log('Header line:', actualHeaderLine);
    
    // Create CSV text with just the header and data rows
    const csvData = [actualHeaderLine, ...lines.slice(headerLineIndex + 1)]
      .filter(line => line.trim().length > 0) // Remove empty lines
      .join('\n');
    
    // Parse the cleaned CSV
    const results = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.toLowerCase().replace(/\s+/g, '_')
    });

    console.log('Cleaned CSV Headers:', results.meta?.fields);
    console.log('First cleaned row:', results.data[0]);

    if (results.errors.length > 0) {
      return NextResponse.json(
        { error: 'CSV parsing error', details: results.errors },
        { status: 400 }
      );
    }

    // Process the cleaned Lead Hero CSV data
    const response = processCSVData(results, totalSpent);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Error uploading CSV:', error);
    return NextResponse.json(
      { error: 'Failed to upload CSV file' },
      { status: 500 }
    );
  }
}