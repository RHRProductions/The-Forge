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
  // EMAIL 1: The Medicare Surprise (Day 0)
  {
    stepOrder: 1,
    delayDays: 0,
    subjectLine: "{first_name}, what they don't tell you about Medicare",
    bodyHtml: `
      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">Hi {first_name},</p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">Most people turning 65 in {city} think Medicare covers everything.</p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;"><strong>It doesn't.</strong></p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">Here's what catches people off guard:</p>

      <ul style="font-size: 16px; color: #1f2937; line-height: 1.8;">
        <li>Medicare Parts A, B, and D only cover about 80% of your costs</li>
        <li>That 20% gap can mean thousands out of pocket</li>
        <li>Miss your enrollment window? Late penalties can follow you for life</li>
      </ul>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">Without secondary coverage, you're exposed to costs that can devastate your retirement savings.</p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;"><strong>That's where I come in.</strong></p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">I'm a local Medicare advisor right here in {city}. I help {state} residents understand how Medicare actually works, what their real costs are, and what they're eligible for.</p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">I meet with people face-to-face (or by phone/video if you prefer) to walk through everything together.</p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;"><strong>Let's sit down and make sure you're not overpaying.</strong></p>

      <p><a href="{booking_link}" style="display: inline-block; background-color: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Schedule Your Free Sit-Down Review</a></p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6; margin-top: 15px;">No pressure. No sales pitch. Just a personal guide you can count on.</p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">Talk soon,<br>
      {agent_name}<br>
      Licensed Medicare Advisor<br>
      {agent_phone}</p>

      <p style="font-size: 16px; color: #1f2937; margin-top: 30px; font-weight: 500;">
        P.S. — Don't risk late enrollment penalties. Let's make sure you're on track.
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

      <p style="font-size: 11px; color: #9ca3af; line-height: 1.6;">
        <strong>Marc Anthony Spagnuolo</strong><br>
        Right Hand Retirement<br>
        P.O. Box [TBD], Aurora, CO 80011<br>
        720-447-4966 | marcanthony@righthandretirement.com<br><br>
        <a href="{unsubscribe_link}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a> | <a href="https://righthandretirement.com" style="color: #9ca3af; text-decoration: underline;">Visit Our Website</a>
      </p>

      <p style="font-size: 10px; color: #9ca3af; line-height: 1.5; margin-top: 15px; padding: 10px; background-color: #f9fafb; border-left: 3px solid #dc2626;">
        <strong>CMS Disclaimer:</strong> We do not offer every plan available in your area. Any information we provide is limited to those plans we do offer in your area. Please contact Medicare.gov or 1-800-MEDICARE to get information on all of your options.<br><br>
        For more information on our carrier options:<br>
        • <a href="https://www.medicareenroll.com/?purl=undefined" style="color: #9ca3af; text-decoration: underline;">Medicare Enroll</a><br>
        • <a href="https://www.planenroll.com/?purl=1DwkmXow" style="color: #9ca3af; text-decoration: underline;">Plan Enroll</a>
      </p>
    `,
    bodyText: `Hi {first_name},

Most people turning 65 in {city} think Medicare covers everything.

It doesn't.

Here's what catches people off guard:

• Medicare Parts A, B, and D only cover about 80% of your costs
• That 20% gap can mean thousands out of pocket
• Miss your enrollment window? Late penalties can follow you for life

Without secondary coverage, you're exposed to costs that can devastate your retirement savings.

That's where I come in.

I'm a local Medicare advisor right here in {city}. I help {state} residents understand how Medicare actually works, what their real costs are, and what they're eligible for.

I meet with people face-to-face (or by phone/video if you prefer) to walk through everything together.

Let's sit down and make sure you're not overpaying.

Schedule Your Free Sit-Down Review: {booking_link}

No pressure. No sales pitch. Just a personal guide you can count on.

Talk soon,
{agent_name}
Licensed Medicare Advisor
{agent_phone}

P.S. — Don't risk late enrollment penalties. Let's make sure you're on track.

---
Marc Anthony Spagnuolo
Right Hand Retirement
P.O. Box [TBD], Aurora, CO 80011
720-447-4966 | marcanthony@righthandretirement.com

Unsubscribe: {unsubscribe_link}

---
CMS Disclaimer: We do not offer every plan available in your area. Any information we provide is limited to those plans we do offer in your area. Please contact Medicare.gov or 1-800-MEDICARE to get information on all of your options.

For more information on our carrier options:
• Medicare Enroll: https://www.medicareenroll.com/?purl=undefined
• Plan Enroll: https://www.planenroll.com/?purl=1DwkmXow`
  },

  // EMAIL 2: Two Paths Forward (Day 3)
  {
    stepOrder: 2,
    delayDays: 3,
    subjectLine: "Two ways to fill the Medicare gap",
    bodyHtml: `
      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">Hi {first_name},</p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">Remember that 20% gap I mentioned?</p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">The good news: There are two routes to fill it.</p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;"><strong>Option 1: Medicare Supplement Plans</strong><br>
      These work alongside Original Medicare and help cover the 20% gap.</p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;"><strong>Option 2: Medicare Advantage Plans</strong><br>
      These replace Original Medicare and typically come with low or no premiums, plus extra benefits.</p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">Most people I work with end up choosing Advantage plans because they offer more value for less cost.</p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;"><strong>But the right choice depends on YOUR situation.</strong></p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">Your health needs. Your budget. Your doctors. Your medications.</p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">That's what I help you figure out.</p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;"><strong>Join my free Medicare 101 workshop this Friday where I'll break down both options in plain English.</strong></p>

      <p><a href="{livestream_link}" style="display: inline-block; background-color: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Save Your Spot (Free)</a></p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6; margin-top: 15px;">45 minutes. Live Q&A. No jargon. No pressure.</p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">Best,<br>
      {agent_name}<br>
      {agent_phone}</p>

      <p style="font-size: 16px; color: #1f2937; margin-top: 30px; font-weight: 500;">
        P.S. — There's no "one size fits all" with Medicare. Let's find what fits YOU.
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

      <p style="font-size: 11px; color: #9ca3af; line-height: 1.6;">
        <strong>Marc Anthony Spagnuolo</strong><br>
        Right Hand Retirement<br>
        P.O. Box [TBD], Aurora, CO 80011<br>
        720-447-4966 | marcanthony@righthandretirement.com<br><br>
        <a href="{unsubscribe_link}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a> | <a href="https://righthandretirement.com" style="color: #9ca3af; text-decoration: underline;">Visit Our Website</a>
      </p>

      <p style="font-size: 10px; color: #9ca3af; line-height: 1.5; margin-top: 15px; padding: 10px; background-color: #f9fafb; border-left: 3px solid #dc2626;">
        <strong>CMS Disclaimer:</strong> We do not offer every plan available in your area. Any information we provide is limited to those plans we do offer in your area. Please contact Medicare.gov or 1-800-MEDICARE to get information on all of your options.<br><br>
        For more information on our carrier options:<br>
        • <a href="https://www.medicareenroll.com/?purl=undefined" style="color: #9ca3af; text-decoration: underline;">Medicare Enroll</a><br>
        • <a href="https://www.planenroll.com/?purl=1DwkmXow" style="color: #9ca3af; text-decoration: underline;">Plan Enroll</a>
      </p>
    `,
    bodyText: `Hi {first_name},

Remember that 20% gap I mentioned?

The good news: There are two routes to fill it.

Option 1: Medicare Supplement Plans
These work alongside Original Medicare and help cover the 20% gap.

Option 2: Medicare Advantage Plans
These replace Original Medicare and typically come with low or no premiums, plus extra benefits.

Most people I work with end up choosing Advantage plans because they offer more value for less cost.

But the right choice depends on YOUR situation.

Your health needs. Your budget. Your doctors. Your medications.

That's what I help you figure out.

Join my free Medicare 101 workshop this Friday where I'll break down both options in plain English.

Save Your Spot (Free): {livestream_link}

45 minutes. Live Q&A. No jargon. No pressure.

Best,
{agent_name}
{agent_phone}

P.S. — There's no "one size fits all" with Medicare. Let's find what fits YOU.

---
Marc Anthony Spagnuolo
Right Hand Retirement
P.O. Box [TBD], Aurora, CO 80011
720-447-4966 | marcanthony@righthandretirement.com

Unsubscribe: {unsubscribe_link}

---
CMS Disclaimer: We do not offer every plan available in your area. Any information we provide is limited to those plans we do offer in your area. Please contact Medicare.gov or 1-800-MEDICARE to get information on all of your options.

For more information on our carrier options:
• Medicare Enroll: https://www.medicareenroll.com/?purl=undefined
• Plan Enroll: https://www.planenroll.com/?purl=1DwkmXow`
  },

  // EMAIL 3: What Most People Don't Know (Day 7)
  {
    stepOrder: 3,
    delayDays: 7,
    subjectLine: "What most people don't know about their options",
    bodyHtml: `
      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">Hi {first_name},</p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">I want to share something that surprises most people I work with.</p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">When it comes to Medicare Advantage plans, many people don't realize the kinds of benefits that can be included.</p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">In my experience, I've seen plans that include things like:</p>

      <ul style="font-size: 16px; color: #1f2937; line-height: 1.8;">
        <li>Dental benefits</li>
        <li>Vision coverage</li>
        <li>Gym memberships</li>
        <li>Healthy incentives</li>
        <li>Over-the-counter allowances</li>
        <li>And more</li>
      </ul>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;"><strong>But here's the key:</strong> Every plan is different, and what you're eligible for depends on your specific situation and location.</p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">That's why a personalized, sit-down review matters.</p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">I help you see what options actually exist in your area, based on your unique needs. We can meet in person, by phone, or video — whatever works best for you.</p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;"><strong>Let me show you what you might be eligible for.</strong></p>

      <p><a href="{booking_link}" style="display: inline-block; background-color: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Schedule Your Free In-Person Review</a></p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6; margin-top: 15px;">No generic advice. Just real answers for YOUR situation, from a local advisor who's here when you need me.</p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">Best,<br>
      {agent_name}<br>
      {agent_phone}</p>

      <p style="font-size: 16px; color: #1f2937; margin-top: 30px; font-weight: 500;">
        P.S. — You might be eligible for benefits you didn't even know existed. Let's find out.
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

      <p style="font-size: 11px; color: #9ca3af; line-height: 1.6;">
        <strong>Marc Anthony Spagnuolo</strong><br>
        Right Hand Retirement<br>
        P.O. Box [TBD], Aurora, CO 80011<br>
        720-447-4966 | marcanthony@righthandretirement.com<br><br>
        <a href="{unsubscribe_link}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a> | <a href="https://righthandretirement.com" style="color: #9ca3af; text-decoration: underline;">Visit Our Website</a>
      </p>

      <p style="font-size: 10px; color: #9ca3af; line-height: 1.5; margin-top: 15px; padding: 10px; background-color: #f9fafb; border-left: 3px solid #dc2626;">
        <strong>CMS Disclaimer:</strong> We do not offer every plan available in your area. Any information we provide is limited to those plans we do offer in your area. Please contact Medicare.gov or 1-800-MEDICARE to get information on all of your options.<br><br>
        For more information on our carrier options:<br>
        • <a href="https://www.medicareenroll.com/?purl=undefined" style="color: #9ca3af; text-decoration: underline;">Medicare Enroll</a><br>
        • <a href="https://www.planenroll.com/?purl=1DwkmXow" style="color: #9ca3af; text-decoration: underline;">Plan Enroll</a>
      </p>
    `,
    bodyText: `Hi {first_name},

I want to share something that surprises most people I work with.

When it comes to Medicare Advantage plans, many people don't realize the kinds of benefits that can be included.

In my experience, I've seen plans that include things like:

• Dental benefits
• Vision coverage
• Gym memberships
• Healthy incentives
• Over-the-counter allowances
• And more

But here's the key: Every plan is different, and what you're eligible for depends on your specific situation and location.

That's why a personalized, sit-down review matters.

I help you see what options actually exist in your area, based on your unique needs. We can meet in person, by phone, or video — whatever works best for you.

Let me show you what you might be eligible for.

Schedule Your Free In-Person Review: {booking_link}

No generic advice. Just real answers for YOUR situation, from a local advisor who's here when you need me.

Best,
{agent_name}
{agent_phone}

P.S. — You might be eligible for benefits you didn't even know existed. Let's find out.

---
Marc Anthony Spagnuolo
Right Hand Retirement
P.O. Box [TBD], Aurora, CO 80011
720-447-4966 | marcanthony@righthandretirement.com

Unsubscribe: {unsubscribe_link}

---
CMS Disclaimer: We do not offer every plan available in your area. Any information we provide is limited to those plans we do offer in your area. Please contact Medicare.gov or 1-800-MEDICARE to get information on all of your options.

For more information on our carrier options:
• Medicare Enroll: https://www.medicareenroll.com/?purl=undefined
• Plan Enroll: https://www.planenroll.com/?purl=1DwkmXow`
  },

  // EMAIL 4: The Costly Mistake (Day 10)
  {
    stepOrder: 4,
    delayDays: 10,
    subjectLine: "The #1 mistake people make with Medicare",
    bodyHtml: `
      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">Hi {first_name},</p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">Let me tell you about Sarah.</p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">She picked a Medicare plan that looked great on paper. Low premium. Good benefits.</p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;"><strong>Then she found out her doctor wasn't covered.</strong></p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">And two of her medications weren't on the plan's formulary.</p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">This is the #1 mistake people make: <strong>Not checking coverage before enrolling.</strong></p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">You need to know:</p>

      <ul style="font-size: 16px; color: #1f2937; line-height: 1.8;">
        <li>Are your doctors in-network?</li>
        <li>Are your medications covered?</li>
        <li>What will your actual out-of-pocket costs be?</li>
      </ul>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;"><strong>This is exactly what I help with.</strong></p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">Join my free Medicare workshop this Friday where I'll show you exactly how to check if your doctors and medications are covered — so you can avoid Sarah's mistake.</p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;"><strong>Plus live Q&A to get all your questions answered.</strong></p>

      <p><a href="{livestream_link}" style="display: inline-block; background-color: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Register for Free Workshop</a></p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6; margin-top: 15px;">Don't make the same mistake Sarah did. Learn how to check coverage before you enroll.</p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">See you soon,<br>
      {agent_name}<br>
      {agent_phone}</p>

      <p style="font-size: 16px; color: #1f2937; margin-top: 30px; font-weight: 500;">
        P.S. — A 15-minute call now can save you thousands in unexpected costs later.
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

      <p style="font-size: 11px; color: #9ca3af; line-height: 1.6;">
        <strong>Marc Anthony Spagnuolo</strong><br>
        Right Hand Retirement<br>
        P.O. Box [TBD], Aurora, CO 80011<br>
        720-447-4966 | marcanthony@righthandretirement.com<br><br>
        <a href="{unsubscribe_link}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a> | <a href="https://righthandretirement.com" style="color: #9ca3af; text-decoration: underline;">Visit Our Website</a>
      </p>

      <p style="font-size: 10px; color: #9ca3af; line-height: 1.5; margin-top: 15px; padding: 10px; background-color: #f9fafb; border-left: 3px solid #dc2626;">
        <strong>CMS Disclaimer:</strong> We do not offer every plan available in your area. Any information we provide is limited to those plans we do offer in your area. Please contact Medicare.gov or 1-800-MEDICARE to get information on all of your options.<br><br>
        For more information on our carrier options:<br>
        • <a href="https://www.medicareenroll.com/?purl=undefined" style="color: #9ca3af; text-decoration: underline;">Medicare Enroll</a><br>
        • <a href="https://www.planenroll.com/?purl=1DwkmXow" style="color: #9ca3af; text-decoration: underline;">Plan Enroll</a>
      </p>
    `,
    bodyText: `Hi {first_name},

Let me tell you about Sarah.

She picked a Medicare plan that looked great on paper. Low premium. Good benefits.

Then she found out her doctor wasn't covered.

And two of her medications weren't on the plan's formulary.

This is the #1 mistake people make: Not checking coverage before enrolling.

You need to know:

• Are your doctors in-network?
• Are your medications covered?
• What will your actual out-of-pocket costs be?

This is exactly what I help with.

Join my free Medicare workshop this Friday where I'll show you exactly how to check if your doctors and medications are covered — so you can avoid Sarah's mistake.

Plus live Q&A to get all your questions answered.

Register for Free Workshop: {livestream_link}

Don't make the same mistake Sarah did. Learn how to check coverage before you enroll.

See you soon,
{agent_name}
{agent_phone}

P.S. — A 15-minute call now can save you thousands in unexpected costs later.

---
Marc Anthony Spagnuolo
Right Hand Retirement
P.O. Box [TBD], Aurora, CO 80011
720-447-4966 | marcanthony@righthandretirement.com

Unsubscribe: {unsubscribe_link}

---
CMS Disclaimer: We do not offer every plan available in your area. Any information we provide is limited to those plans we do offer in your area. Please contact Medicare.gov or 1-800-MEDICARE to get information on all of your options.

For more information on our carrier options:
• Medicare Enroll: https://www.medicareenroll.com/?purl=undefined
• Plan Enroll: https://www.planenroll.com/?purl=1DwkmXow`
  },

  // EMAIL 5: I'm Here to Help (Day 14)
  {
    stepOrder: 5,
    delayDays: 14,
    subjectLine: "{first_name}, I'm here when you're ready",
    bodyHtml: `
      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">Hi {first_name},</p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">I've sent you a few emails about Medicare, but haven't heard back.</p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">That's totally fine — I know your inbox is probably packed.</p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">But I wanted to reach out one more time because <strong>Medicare can be confusing</strong>, and you're not alone in feeling overwhelmed.</p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">As your local Medicare advisor, here's what I do:</p>

      <ul style="font-size: 16px; color: #1f2937; line-height: 1.8;">
        <li>Help you understand how Medicare actually works</li>
        <li>Show you what your real costs will be</li>
        <li>Explain what you're eligible for in your area</li>
        <li>Make sure your doctors and medications are covered</li>
      </ul>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;"><strong>And I'm here year-round</strong> — not just during enrollment season.</p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">Whether you're turning 65 for the first time or you've been on Medicare for years, I can help. We can meet in person, by phone, or video — whatever is most comfortable for you.</p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;"><strong>Let's sit down and get you the clarity you need.</strong></p>

      <p><a href="{booking_link}" style="display: inline-block; background-color: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Schedule Your Free Sit-Down Meeting</a></p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6; margin-top: 15px;">A personal guide, right here in {city}. A real person you can count on.</p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">No hard feelings if this isn't for you — just click "unsubscribe" below and you won't hear from me again.</p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">But if you need help navigating Medicare, I'm just one click away.</p>

      <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">Rooting for you,<br>
      {agent_name}<br>
      Licensed Medicare Advisor<br>
      {agent_phone}</p>

      <p style="font-size: 16px; color: #1f2937; margin-top: 30px; font-weight: 500;">
        P.S. — You don't have to figure this out alone. Let me help.
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

      <p style="font-size: 11px; color: #9ca3af; line-height: 1.6;">
        <strong>Marc Anthony Spagnuolo</strong><br>
        Right Hand Retirement<br>
        P.O. Box [TBD], Aurora, CO 80011<br>
        720-447-4966 | marcanthony@righthandretirement.com<br><br>
        <a href="{unsubscribe_link}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a> | <a href="https://righthandretirement.com" style="color: #9ca3af; text-decoration: underline;">Visit Our Website</a>
      </p>

      <p style="font-size: 10px; color: #9ca3af; line-height: 1.5; margin-top: 15px; padding: 10px; background-color: #f9fafb; border-left: 3px solid #dc2626;">
        <strong>CMS Disclaimer:</strong> We do not offer every plan available in your area. Any information we provide is limited to those plans we do offer in your area. Please contact Medicare.gov or 1-800-MEDICARE to get information on all of your options.<br><br>
        For more information on our carrier options:<br>
        • <a href="https://www.medicareenroll.com/?purl=undefined" style="color: #9ca3af; text-decoration: underline;">Medicare Enroll</a><br>
        • <a href="https://www.planenroll.com/?purl=1DwkmXow" style="color: #9ca3af; text-decoration: underline;">Plan Enroll</a>
      </p>
    `,
    bodyText: `Hi {first_name},

I've sent you a few emails about Medicare, but haven't heard back.

That's totally fine — I know your inbox is probably packed.

But I wanted to reach out one more time because Medicare can be confusing, and you're not alone in feeling overwhelmed.

As your local Medicare advisor, here's what I do:

• Help you understand how Medicare actually works
• Show you what your real costs will be
• Explain what you're eligible for in your area
• Make sure your doctors and medications are covered

And I'm here year-round — not just during enrollment season.

Whether you're turning 65 for the first time or you've been on Medicare for years, I can help. We can meet in person, by phone, or video — whatever is most comfortable for you.

Let's sit down and get you the clarity you need.

Schedule Your Free Sit-Down Meeting: {booking_link}

A personal guide, right here in {city}. A real person you can count on.

No hard feelings if this isn't for you — just click "unsubscribe" below and you won't hear from me again.

But if you need help navigating Medicare, I'm just one click away.

Rooting for you,
{agent_name}
Licensed Medicare Advisor
{agent_phone}

P.S. — You don't have to figure this out alone. Let me help.

---
Marc Anthony Spagnuolo
Right Hand Retirement
P.O. Box [TBD], Aurora, CO 80011
720-447-4966 | marcanthony@righthandretirement.com

Unsubscribe: {unsubscribe_link}

---
CMS Disclaimer: We do not offer every plan available in your area. Any information we provide is limited to those plans we do offer in your area. Please contact Medicare.gov or 1-800-MEDICARE to get information on all of your options.

For more information on our carrier options:
• Medicare Enroll: https://www.medicareenroll.com/?purl=undefined
• Plan Enroll: https://www.planenroll.com/?purl=1DwkmXow`
  }
];
