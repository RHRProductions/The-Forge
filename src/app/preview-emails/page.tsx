'use client';

import { medicareSequenceTemplates } from '../../../lib/email/cold-email-templates';
import { personalizeContent, PersonalizationData } from '../../../lib/email/personalization';

export default function PreviewEmailsPage() {
  // Sample personalization data
  const sampleData: PersonalizationData = {
    first_name: 'John',
    last_name: 'Smith',
    age: 66,
    city: 'Denver',
    state: 'CO',
    agent_name: 'Marc Anthony',
    agent_phone: '720-447-4966',
    agent_email: 'marcanthony@righthandretirement.com',
    booking_link: 'http://localhost:3002/book?lead=123',
    livestream_link: 'http://localhost:3002/livestream/register?lead=123',
    unsubscribe_link: 'http://localhost:3002/unsubscribe?email=john.smith@example.com',
    company_name: 'Right Hand Retirement',
    company_address: '13034 E 14th Ave, Aurora, CO 80011'
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Email Sequence Preview</h1>
          <p className="text-gray-600">
            Preview all 5 emails with sample personalization data
          </p>
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Sample Data:</strong> {sampleData.first_name} {sampleData.last_name},
              Age {sampleData.age}, {sampleData.city}, {sampleData.state}
            </p>
          </div>
        </div>

        {medicareSequenceTemplates.map((template, index) => {
          const personalizedSubject = personalizeContent(
            template.subjectLine,
            sampleData
          );

          const personalizedHtml = personalizeContent(
            template.bodyHtml,
            sampleData
          );

          return (
            <div key={index} className="mb-8 bg-white rounded-lg shadow-lg overflow-hidden">
              {/* Email Header */}
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-bold">
                    Email {template.stepOrder} of 5
                  </h2>
                  <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                    Day {template.delayDays}
                  </span>
                </div>
                <p className="text-red-100 text-sm">
                  Sent {template.delayDays === 0 ? 'immediately' : `${template.delayDays} days after enrollment`}
                </p>
              </div>

              {/* Email Metadata */}
              <div className="border-b border-gray-200 p-4 bg-gray-50">
                <div className="space-y-2 text-sm">
                  <div className="flex">
                    <span className="font-semibold w-20">From:</span>
                    <span>{sampleData.agent_name} &lt;{sampleData.agent_email}&gt;</span>
                  </div>
                  <div className="flex">
                    <span className="font-semibold w-20">To:</span>
                    <span>{sampleData.first_name} {sampleData.last_name} &lt;john.smith@example.com&gt;</span>
                  </div>
                  <div className="flex">
                    <span className="font-semibold w-20">Subject:</span>
                    <span className="font-bold text-gray-900">{personalizedSubject}</span>
                  </div>
                </div>
              </div>

              {/* Email Body Preview */}
              <div className="p-6">
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: personalizedHtml }}
                />
              </div>

              {/* View Plain Text Toggle */}
              <details className="border-t border-gray-200 p-4 bg-gray-50">
                <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-gray-900">
                  View Plain Text Version
                </summary>
                <pre className="mt-4 text-xs bg-white p-4 rounded border border-gray-200 overflow-auto whitespace-pre-wrap">
                  {personalizeContent(template.bodyText, sampleData)}
                </pre>
              </details>
            </div>
          );
        })}

        {/* Legend */}
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-bold text-blue-900 mb-3">How Personalization Works:</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="font-mono bg-white px-2 py-1 rounded text-blue-700">
                {'{first_name}'}
              </span>
              <span className="ml-2 text-blue-800">→ {sampleData.first_name}</span>
            </div>
            <div>
              <span className="font-mono bg-white px-2 py-1 rounded text-blue-700">
                {'{last_name}'}
              </span>
              <span className="ml-2 text-blue-800">→ {sampleData.last_name}</span>
            </div>
            <div>
              <span className="font-mono bg-white px-2 py-1 rounded text-blue-700">
                {'{age}'}
              </span>
              <span className="ml-2 text-blue-800">→ {sampleData.age}</span>
            </div>
            <div>
              <span className="font-mono bg-white px-2 py-1 rounded text-blue-700">
                {'{city}'}
              </span>
              <span className="ml-2 text-blue-800">→ {sampleData.city}</span>
            </div>
            <div>
              <span className="font-mono bg-white px-2 py-1 rounded text-blue-700">
                {'{state}'}
              </span>
              <span className="ml-2 text-blue-800">→ {sampleData.state}</span>
            </div>
            <div>
              <span className="font-mono bg-white px-2 py-1 rounded text-blue-700">
                {'{agent_name}'}
              </span>
              <span className="ml-2 text-blue-800">→ {sampleData.agent_name}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
