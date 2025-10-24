/**
 * Cold Email Templates for Medicare Lead Nurturing
 *
 * These templates follow proven cold email frameworks:
 * - Short, scannable emails (under 150 words)
 * - Curiosity-driven subject lines
 * - Problem-aware messaging
 * - Clear single CTA
 * - Personalization variables
 */

export interface EmailTemplate {
  stepOrder: number;
  delayDays: number;
  subjectLine: string;
  bodyHtml: string;
  bodyText: string;
}

/**
 * Personalization variables available:
 * {first_name} - Lead's first name
 * {last_name} - Lead's last name
 * {age} - Lead's age
 * {city} - Lead's city
 * {state} - Lead's state
 * {agent_name} - Agent's name
 * {agent_phone} - Agent's phone
 * {booking_link} - Link to book appointment
 * {livestream_link} - Link to register for livestream
 */

export const medicareSequenceTemplates: EmailTemplate[] = [
  // EMAIL 1: Curiosity Hook + Pattern Interrupt (Day 0)
  {
    stepOrder: 1,
    delayDays: 0,
    subjectLine: "{first_name}, are you making these Medicare mistakes?",
    bodyHtml: `
      <p>Hi {first_name},</p>

      <p>Most people turning 65 in {city} don't realize they're leaving money on the table with Medicare.</p>

      <p>In fact, the average person overpays by $1,800/year because they don't know about:</p>

      <ul>
        <li>Hidden Plan G vs Plan N savings</li>
        <li>Prescription drug cost traps</li>
        <li>The "birthday rule" loophole</li>
      </ul>

      <p><strong>I help {state} residents navigate Medicare enrollment without the confusion.</strong></p>

      <p>Want to make sure you're not overpaying?</p>

      <p><a href="{booking_link}" style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Book a Free 15-Minute Review</a></p>

      <p>No pressure. No sales pitch. Just straight answers.</p>

      <p>Talk soon,<br>
      {agent_name}<br>
      Licensed Medicare Advisor<br>
      {agent_phone}</p>

      <p style="font-size: 12px; color: #666; margin-top: 30px;">
        P.S. — Spots fill fast during enrollment season. Grab a time that works for you while they last.
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

      <p style="font-size: 11px; color: #9ca3af; line-height: 1.6;">
        Right Hand Retirement<br>
        13034 E 14th Ave, Aurora, CO 80011<br>
        720-447-4966 | marcanthony@righthandretirement.com
      </p>
    `,
    bodyText: `Hi {first_name},

Most people turning 65 in {city} don't realize they're leaving money on the table with Medicare.

In fact, the average person overpays by $1,800/year because they don't know about:

• Hidden Plan G vs Plan N savings
• Prescription drug cost traps
• The "birthday rule" loophole

I help {state} residents navigate Medicare enrollment without the confusion.

Want to make sure you're not overpaying?

Book a Free 15-Minute Review: {booking_link}

No pressure. No sales pitch. Just straight answers.

Talk soon,
{agent_name}
Licensed Medicare Advisor
{agent_phone}

P.S. — Spots fill fast during enrollment season. Grab a time that works for you while they last.`
  },

  // EMAIL 2: Education + Livestream Invite (Day 3)
  {
    stepOrder: 2,
    delayDays: 3,
    subjectLine: "Free Medicare workshop this Friday (online)",
    bodyHtml: `
      <p>Hi {first_name},</p>

      <p>Quick question: Are you confused about when to enroll in Medicare?</p>

      <p>You're not alone. Last week, I talked to someone who missed their enrollment window and got hit with a <strong>permanent late penalty of $67/month</strong>. Ouch.</p>

      <p><strong>That's why I'm hosting a free online Medicare workshop this Friday.</strong></p>

      <p>In 45 minutes, you'll learn:</p>

      <ul>
        <li>✓ The 3 enrollment periods (and which one applies to you)</li>
        <li>✓ How to avoid costly penalties and coverage gaps</li>
        <li>✓ Medigap vs Medicare Advantage: Which is right for you?</li>
        <li>✓ How to compare drug plans and save hundreds per year</li>
      </ul>

      <p><a href="{livestream_link}" style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Save Your Spot (Free)</a></p>

      <p><strong>When:</strong> This Friday at 10:00 AM MT<br>
      <strong>Where:</strong> Online (link sent after registration)<br>
      <strong>Cost:</strong> $0</p>

      <p>Bring your questions. I'll answer them all.</p>

      <p>See you there,<br>
      {agent_name}<br>
      {agent_phone}</p>

      <p style="font-size: 12px; color: #666; margin-top: 30px;">
        P.S. — Can't make it? No worries. <a href="{booking_link}">Book a one-on-one call</a> instead.
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

      <p style="font-size: 11px; color: #9ca3af; line-height: 1.6;">
        Right Hand Retirement<br>
        13034 E 14th Ave, Aurora, CO 80011<br>
        720-447-4966 | marcanthony@righthandretirement.com
      </p>
    `,
    bodyText: `Hi {first_name},

Quick question: Are you confused about when to enroll in Medicare?

You're not alone. Last week, I talked to someone who missed their enrollment window and got hit with a permanent late penalty of $67/month. Ouch.

That's why I'm hosting a free online Medicare workshop this Friday.

In 45 minutes, you'll learn:

✓ The 3 enrollment periods (and which one applies to you)
✓ How to avoid costly penalties and coverage gaps
✓ Medigap vs Medicare Advantage: Which is right for you?
✓ How to compare drug plans and save hundreds per year

Save Your Spot (Free): {livestream_link}

When: This Friday at 10:00 AM MT
Where: Online (link sent after registration)
Cost: $0

Bring your questions. I'll answer them all.

See you there,
{agent_name}
{agent_phone}

P.S. — Can't make it? No worries. Book a one-on-one call instead: {booking_link}`
  },

  // EMAIL 3: Social Proof + Testimonial (Day 7)
  {
    stepOrder: 3,
    delayDays: 7,
    subjectLine: "How Linda saved $2,400/year on Medicare",
    bodyHtml: `
      <p>Hi {first_name},</p>

      <p>I wanted to share a quick win from last week.</p>

      <p>Linda (64, from Colorado Springs) was about to enroll in a Medicare Advantage plan her friend recommended.</p>

      <p><strong>But we found her a better option that saves her $2,400/year.</strong></p>

      <p>Here's what made the difference:</p>

      <blockquote style="border-left: 4px solid #dc2626; padding-left: 16px; margin: 20px 0; font-style: italic; color: #555;">
        "I had no idea there were so many hidden costs in that plan. {agent_name} walked me through everything in plain English. No jargon. No pressure. Just real help. I'm so glad I didn't sign up blindly!"
        <br><br>
        — Linda S., Colorado Springs
      </blockquote>

      <p>The problem? Most people don't know what questions to ask.</p>

      <p>They end up with:</p>
      <ul>
        <li>❌ Plans that don't cover their doctors</li>
        <li>❌ High prescription drug costs</li>
        <li>❌ Surprise out-of-pocket expenses</li>
      </ul>

      <p><strong>Want to make sure you're not leaving money on the table?</strong></p>

      <p><a href="{booking_link}" style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Book Your Free Medicare Review</a></p>

      <p>15 minutes. Zero obligation. Real answers.</p>

      <p>Best,<br>
      {agent_name}<br>
      {agent_phone}</p>

      <p style="font-size: 12px; color: #666; margin-top: 30px;">
        P.S. — I have 3 spots open this week. First come, first served.
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

      <p style="font-size: 11px; color: #9ca3af; line-height: 1.6;">
        Right Hand Retirement<br>
        13034 E 14th Ave, Aurora, CO 80011<br>
        720-447-4966 | marcanthony@righthandretirement.com
      </p>
    `,
    bodyText: `Hi {first_name},

I wanted to share a quick win from last week.

Linda (64, from Colorado Springs) was about to enroll in a Medicare Advantage plan her friend recommended.

But we found her a better option that saves her $2,400/year.

Here's what made the difference:

"I had no idea there were so many hidden costs in that plan. {agent_name} walked me through everything in plain English. No jargon. No pressure. Just real help. I'm so glad I didn't sign up blindly!"

— Linda S., Colorado Springs

The problem? Most people don't know what questions to ask.

They end up with:
❌ Plans that don't cover their doctors
❌ High prescription drug costs
❌ Surprise out-of-pocket expenses

Want to make sure you're not leaving money on the table?

Book Your Free Medicare Review: {booking_link}

15 minutes. Zero obligation. Real answers.

Best,
{agent_name}
{agent_phone}

P.S. — I have 3 spots open this week. First come, first served.`
  },

  // EMAIL 4: Urgency + Event Reminder (Day 10)
  {
    stepOrder: 4,
    delayDays: 10,
    subjectLine: "Livestream starts Friday → last call",
    bodyHtml: `
      <p>Hi {first_name},</p>

      <p>Just a quick heads up — our free Medicare workshop is <strong>this Friday at 10:00 AM MT</strong>.</p>

      <p>We're at 47/50 seats filled. Once we hit capacity, registration closes.</p>

      <p><strong>Here's what you'll walk away with:</strong></p>

      <ul>
        <li>✓ A clear Medicare enrollment timeline (no more confusion)</li>
        <li>✓ How to compare plans apples-to-apples</li>
        <li>✓ 3 ways to cut your prescription costs in half</li>
        <li>✓ The #1 mistake that costs retirees $1,500+/year</li>
      </ul>

      <p><a href="{livestream_link}" style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Grab Your Spot Before It's Full</a></p>

      <p><strong>When:</strong> This Friday, 10:00 AM MT<br>
      <strong>Format:</strong> Live Q&A included<br>
      <strong>Duration:</strong> 45 minutes</p>

      <p>No sales pitch. No pressure. Just education.</p>

      <p>See you Friday,<br>
      {agent_name}<br>
      {agent_phone}</p>

      <p style="font-size: 12px; color: #666; margin-top: 30px;">
        P.S. — Rather talk one-on-one? <a href="{booking_link}">Book a private call here</a>.
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

      <p style="font-size: 11px; color: #9ca3af; line-height: 1.6;">
        Right Hand Retirement<br>
        13034 E 14th Ave, Aurora, CO 80011<br>
        720-447-4966 | marcanthony@righthandretirement.com
      </p>
    `,
    bodyText: `Hi {first_name},

Just a quick heads up — our free Medicare workshop is this Friday at 10:00 AM MT.

We're at 47/50 seats filled. Once we hit capacity, registration closes.

Here's what you'll walk away with:

✓ A clear Medicare enrollment timeline (no more confusion)
✓ How to compare plans apples-to-apples
✓ 3 ways to cut your prescription costs in half
✓ The #1 mistake that costs retirees $1,500+/year

Grab Your Spot Before It's Full: {livestream_link}

When: This Friday, 10:00 AM MT
Format: Live Q&A included
Duration: 45 minutes

No sales pitch. No pressure. Just education.

See you Friday,
{agent_name}
{agent_phone}

P.S. — Rather talk one-on-one? Book a private call here: {booking_link}`
  },

  // EMAIL 5: Personal Touch + Last Chance (Day 14)
  {
    stepOrder: 5,
    delayDays: 14,
    subjectLine: "{first_name}, can I help?",
    bodyHtml: `
      <p>Hi {first_name},</p>

      <p>I've sent you a few emails about Medicare planning, but haven't heard back.</p>

      <p>That's totally fine — I know your inbox is probably packed.</p>

      <p>But I wanted to reach out one more time because <strong>Medicare enrollment deadlines are unforgiving</strong>.</p>

      <p>Miss your window, and you could face:</p>
      <ul>
        <li>❌ Late enrollment penalties (for life)</li>
        <li>❌ Coverage gaps that leave you exposed</li>
        <li>❌ Higher monthly premiums you'll never get back</li>
      </ul>

      <p>I don't want that to happen to you.</p>

      <p><strong>So here's what I'm offering:</strong></p>

      <p>Book a quick call with me — even just 15 minutes — and I'll:</p>

      <ul>
        <li>✓ Review your current situation</li>
        <li>✓ Answer any Medicare questions you have</li>
        <li>✓ Show you exactly what steps to take next</li>
      </ul>

      <p>Zero cost. Zero obligation. Just clarity.</p>

      <p><a href="{booking_link}" style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Book Your Free Call Here</a></p>

      <p><strong>Or join our next livestream workshop:</strong></p>

      <p><a href="{livestream_link}" style="display: inline-block; background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">Register for Friday's Workshop</a></p>

      <p>Either way, I'm here to help.</p>

      <p>No hard feelings if this isn't for you — just click "unsubscribe" below and you won't hear from me again.</p>

      <p>But if you need help navigating Medicare, I'm just one click away.</p>

      <p>Rooting for you,<br>
      {agent_name}<br>
      Licensed Medicare Advisor<br>
      {agent_phone}</p>

      <p style="font-size: 12px; color: #666; margin-top: 30px;">
        P.S. — Still on the fence? Check out what others are saying: <a href="https://righthandretirement.com">Visit our website</a>
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

      <p style="font-size: 11px; color: #9ca3af; line-height: 1.6;">
        Right Hand Retirement<br>
        13034 E 14th Ave, Aurora, CO 80011<br>
        720-447-4966 | marcanthony@righthandretirement.com
      </p>
    `,
    bodyText: `Hi {first_name},

I've sent you a few emails about Medicare planning, but haven't heard back.

That's totally fine — I know your inbox is probably packed.

But I wanted to reach out one more time because Medicare enrollment deadlines are unforgiving.

Miss your window, and you could face:
❌ Late enrollment penalties (for life)
❌ Coverage gaps that leave you exposed
❌ Higher monthly premiums you'll never get back

I don't want that to happen to you.

So here's what I'm offering:

Book a quick call with me — even just 15 minutes — and I'll:

✓ Review your current situation
✓ Answer any Medicare questions you have
✓ Show you exactly what steps to take next

Zero cost. Zero obligation. Just clarity.

Book Your Free Call Here: {booking_link}

Or join our next livestream workshop: {livestream_link}

Either way, I'm here to help.

No hard feelings if this isn't for you — just unsubscribe below and you won't hear from me again.

But if you need help navigating Medicare, I'm just one click away.

Rooting for you,
{agent_name}
Licensed Medicare Advisor
{agent_phone}

P.S. — Still on the fence? Check out what others are saying at [your testimonials page]`
  }
];
