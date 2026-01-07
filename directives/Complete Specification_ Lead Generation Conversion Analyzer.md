
# Complete Specification: Lead Generation Conversion Analyzer.

## 📋 Table of Contents

1.  Overview & Purpose
2.  User Flow
3.  Scoring System & Weighting
4.  All 10 Categories – Analysis Logic
5.  Teaser Logic

Full ReportPDF SpecificationAdmin Dashboard & Granular Problem TagsError HandlingTechnical Notes

## 1. Overview & Purpose

### 1.1 Product Description

**Lead Generation Conversion Analyzer**  is a tool that automatically analyzes websites' ability to convert visitors into leads. The tool identifies “leaky funnels” – problems that cause potential customers to leave without making contact.

### 1.2 Primary Goal

-   Offer value through free analysis
-   Generate qualified leads for Portalfabriken
-   Position Portalfabriken as an expert in conversion optimization

### 1.3 Target Audience

-   Swedish company websites
-   B2B and B2C
-   Companies that want to increase their lead generation

## 2. User flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌───────── ────┐
```

```
│  HOME PAGE  │ ──▶ │  ANALYZE │ ──▶ │   TEASER    │ ──▶ │ REGISTRATION│ ──▶ │  REPORT    │
```

```
│  (URL input)│     │  (Loading)  │     │  (Results) │     │ (Name+Email)│     │  (Complete)
```

```
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └────────── ───┘
```

### 2.1 View 1: Home page

**Content:**

-   Headline: “Analyze your website's conversion ability”
-   Subheading: “Get a ruthless analysis of what's preventing your website from converting visitors into leads. No fluff—just concrete problems and solutions.”
-   URL input field with placeholder: “Enter the URL to analyze, e.g.  [www.example.se](http://www.example.se/)”
-   Button: “Analyze”
-   Three cards explaining what is being analyzed

### 2.2 View 2: Analyzing (Loading)

**Content**

-   Progress indicator
-   Rotating tips (changes every 4 seconds)

**Tip library:**

# Tip

1 “96% of visitors who come to your website are not ready to buy. Without a lead magnet, you will lose them forever.”

2 "A CTA button with ‘Submit’ converts up to 30% worse than action-oriented language such as ‘Get your free quote’. “

3 ”Websites with visible customer reviews have an average conversion rate that is 270% higher.“

4 ”Each additional field in a form reduces conversion by about 10%.“

5 ”73% of B2B buyers say they want a self-service experience – but 83% still want the option to talk to a human. “

6 ”A clear guarantee can increase conversion by up to 30% by reducing perceived risk.“

7 ”Visitors spend an average of 5.59 seconds looking at written text. Your value proposition must be crystal clear.“

8 ”Social proof near your CTA can increase click-through rates by up to 34%."  

### 2.3 View 3: Teaser (Before Registration)

**Shows:**

-   Overall rating (weighted average, 1-5)
-   Rating category (“Critical” / “Substandard” / “Pass” / ‘Good’ / “Excellent”)
-   The 3 biggest problems (categories with the lowest scores)
-   Call to action to register for the full report

**Hides:**

-   Detailed problem descriptions
-   Concrete recommendations
-   The other 7 categories
-   Strengths

### 2.4 View 4: Registration

**Fields:**

-   First name (required)
-   Email (required)

**Button:**  “Show my report”

**Caption:**  “🔒 We never share your information with third parties.”

### 2.5 View 5: Full Report

See section 6 for detailed specifications.

## 3. Scoring System & Weighting

### 3.1 Weighted Categories

Category Weight Justification

1. Value Proposition  **×2.0** The foundation of everything—without clear value, nothing else matters

2. Call to Action  **×1.5** Direct link to conversion

3. Social Proof ×1.0 Standard

4. Lead Magnets  **×1.5** Critical for capturing non-purchasing visitors

5. Form Design ×1.0 Standard

6. Guarantees ×1.0 Standard

7. Urgency & Scarcity ×0.75 Important but not critical

8. Process Clarity ×1.0 Standard

9. Content Architecture ×0.75 Important but not critical

10. Offer Structure ×1.0 Standard  

**Total max weight:**  2.0 + 1.5 + 1.0 + 1.5 + 1.0 + 1.0 + 0.75 + 1.0 + 0.75 + 1.0 =  **11.5**

### 3.2 Calculation of Total Score

```
Weighted rating = Σ(Category score × Weight) / Σ(Maximum score × Weight)
```

```
= Σ(Category score × Weight) / (5 × 11.5)
```

```
= Σ(Category score × Weight) / 57.5
```

```
Final rating (1-5) = Weighted rating × 5
```

### 3.3 Rating categories

Grade Category Description

1.0 – 1.9  **Critical** The website has serious flaws that significantly hinder conversion

2.0 – 2.9  **Substandard** Several important areas need improvement

3.0 – 3.4  **Pass** The basics are there, but there is clear potential for improvement

3.5 – 4.4  **Good** The website works well but could be further optimized

4.5 – 5.0  **Excellent** The website is optimized for conversion  

### 3.4 Handling Missing Information

When the AI cannot identify relevant information for a category:

**Action:**

-   Set the score to  **3/5**  (neutral)
-   Flag the category as “Not identified”
-   Give recommendations instead of criticism

**Example:**

“We couldn't identify a warranty on your website. If you have one, make sure it's clearly visible and easy to find. If you don't have one, consider introducing one – it can increase conversion by up to 30%.”

## 4. All 10 Categories – Analysis Logic

### Category 1: Value Proposition Clarity (Weight: ×2.0)

**What is analyzed:**

Signal Looking for Score impact

Clear H1 heading Heading that explains what the company offers +1

Benefit focus Text that describes customer benefits, not just features +1

Quick Understanding Concise text that can be understood within 5 seconds +1

Differentiation “Why us,” USPs, comparisons with competitors +1

Proven Claims Numbers, data, specifications that support benefits +1  

**Negative signals:**

-   Vague headline (“Welcome to our website”)
-   Only features without benefits
-   “Branding jargon” without substance
-   Long, complex text above the fold

**Granular problem tags:**

-   `unclear_headline`– Unclear or vague headline
-   `features_not_benefits`– Focus on features instead of benefits
-   `missing_usp`– Lacks clear differentiation
-   `value_prop_too_complex`– Too complex or long explanation
-   `no_proof_points`– Claims without evidence

**Sample texts per point level:**

Score Problem text Recommendation

1 “Your headline ‘{headline}’ does not explain what you offer or what value you create for the customer. Visitors have to guess what your offer is.” "Rewrite the headline so that it clearly communicates: (1) What you do, (2) For whom, and (3) What results the customer can expect. Example: ‘We help Swedish e-retailers double their conversion rate in 90 days.’“

2 ”Your value proposition focuses on features rather than benefits. You tell WHAT you do, but not WHY it is valuable to the customer.“ ” For each feature you mention, add the concrete benefit. Instead of ‘We have 20 years of experience’ – write ‘Our 20 years of experience means you avoid beginner's mistakes and get results faster’.

3 "Your value proposition is understandable but lacks clear differentiation. It is not clear why a visitor should choose you over a competitor.“ ”Add a section that clearly communicates your unique advantage. What do you do that no one else does? Why are you the best choice?“

4 ” Good value proposition with clear advantages, but some claims lack concrete evidence.“ ”Strengthen your claims with specific figures, customer results, or comparisons. ‘Fast delivery’ becomes stronger as ‘Delivery within 24 hours – guaranteed.’"  

### Category 2: Call to Action Effectiveness (Weight: ×1.5)

**What is analyzed:**

Signal Looking for Point impact

CTA exists Clear buttons with call to action +1

Above the fold CTA visible without scrolling +1

Action-oriented language Active language that communicates value +1

Visual contrast Button stands out from its surroundings +1

Multiple CTAs CTA in several strategic locations +1  

**Negative signals:**

-   Generic button texts: “Send,” “Submit,” “Click here,” “Read more”
-   CTA below the fold
-   CTA that blends into the design
-   Only one CTA at the bottom of the page

**Granular problem tags:**

-   `no_cta_found`– No CTA found
-   `cta_below_fold`– CTA not visible without scrolling
-   `generic_cta_text`– Generic button text (“Send,” “Submit”)
-   `low_contrast_cta`– CTA blends in visually
-   `single_cta_placement`– Only one CTA placement
-   `unclear_cta_destination`– Unclear what happens when clicked

**Sample texts per score level:**

Score Problem text Recommendation

1 “We found no clear call-to-action on your home page. Visitors don't know what they are expected to do next.” "Add a clear, high-contrast CTA button above the fold. The button should communicate value, e.g. ‘Get a free quote’ or ‘Start your free trial’. “

2 ”Your CTA uses the text ‘{button text}’, which is generic and does not motivate action.“ ”Switch to action-oriented language that clearly communicates what the visitor will get. Instead of ‘Submit’, use ‘Get your free analysis’ or ‘Book your free call’."

3 “Your CTA is there, but it's placed far down the page. Many visitors will never see it.” “Add a CTA above the fold (visible without scrolling). Then repeat the CTA in strategic places further down the page.”

4 “Good CTA with clear language, but it could be reinforced with a supporting sentence that reduces perceived risk.” “Add a short supporting text below the button, e.g. ‘Free – no obligation’ or ‘Takes only 2 minutes’.”  

### Category 3: Social Proof & Credibility (Weight: ×1.0)

**What is analyzed:**

Signal Looking for Impact on score

Customer reviews/testimonials Quotes from real customers +1

Customer logos Logos from well-known customers/partners +1

Quantitative evidence “500+ customers,” “10 years of experience” +1

Third-party validation Trustpilot, Google Reviews, certifications, awards +1

Strategic placement Social proof near CTA or in a visible place +1  

**Negative signals:**

-   No testimonials
-   Anonymous quotes (“Satisfied customer”)
-   Social proof hidden at the bottom
-   No concrete figures

**Granular problem tags:**

-   `no_social_proof`– No social proof found
-   `no_testimonials`– No customer quotes
-   `anonymous_testimonials`– Testimonials without names/companies
-   `no_client_logos`– No customer logos
-   `no_quantitative_proof`– No figures (number of customers, years, etc.)
-   `no_third_party_validation`– No external reviews/certifications
-   `social_proof_poor_placement`– Social proof not close to decision points

**Sample texts per score level:**

Score Problem text Recommendation

1 "We found no social proof on your website – no customer reviews, logos, or figures that build trust. This is a critical barrier to conversion.“ ”Start by collecting 3-5 customer quotes with names and companies. Place them on the home page, preferably near your CTA. Also add concrete numbers such as ‘X satisfied customers’ or ‘Y years of experience’."

2 “You have some social proof, but it is either anonymous or hidden. We found {element}, but it lacks credibility details.” "Upgrade your testimonials with full names, titles, and companies. If possible, add photos. Move social proof higher up the page, close to your CTAs.“

3 ”You have basic social proof in place, but it is not strategically placed where it is most effective.“ ”Move your best customer quotes and logos so they are visible close to your CTAs. Social proof directly above or below a CTA can significantly increase click-through rates. “

4 ”Good social proof with multiple elements, but you could supplement with more types of evidence for maximum effect.“ ”Consider adding: {missing elements} to create even stronger credibility."  

### Category 4: Lead magnet quality (Weight: ×1.5)

**What is analyzed:**

Signal Looking for Impact on score

Lead magnet exists Free guide, checklist, webinar, calculator, etc. +1

Clear value proposition Clear description of what you get +1

Low threshold Minimal number of fields (preferably just email) +1

Visible placement Easy to find, preferably multiple placements +1

Relevance Linked to the core product/service +1  

**Negative signals (leaky funnels):**

-   `mailto:`-links without forms
-   PDF links without lead capture (open PDFs)
-   Only “Subscribe to newsletter” without value
-   Lead magnet hidden on subpage

**Granular problem tags:**

-   `no_lead_magnet`– No lead magnet found
-   `mailto_link_leak`– mailto: link instead of form
-   `open_pdf_leak`– Valuable PDF without lead capture
-   `weak_lead_magnet_value`– Weak value proposition (“Subscribe to newsletter”)
-   `lead_magnet_hidden`– Lead magnet difficult to find
-   `lead_magnet_too_many_fields`– Too many fields in the form
-   `lead_magnet_irrelevant`– Lead magnet not linked to main offer

**Sample texts per point level:**

Points Problem text Recommendation

1 "You are completely missing a lead magnet. The ~95% of visitors who are not ready to buy immediately have no way of staying in touch with you.“ ”Create a valuable free resource that solves a sub-problem for your target audience. Example: ‘Checklist: 10 things to check before choosing {your service}’ or ‘Guide: How to avoid the 5 most common mistakes when {related to your service}’."

2 “We found a link to ‘{resource}’ that gives away value without capturing contact information. This is a leaky funnel—you are losing potential leads.” “Place the resource behind a simple form (name + email is enough). Keep the value you offer, but make sure you have the opportunity to follow up.”

2 “Your newsletter offer (‘Subscribe to our newsletter’) does not communicate any clear value to the visitor.” “Reformulate the offer to clarify the benefit. Instead of ‘Subscribe to our newsletter’ – try ‘Get weekly tips to increase your sales’ or ‘Be the first to get our best offers’.”

3 “You have a lead magnet, but it's hard to find—we only found it on {location}.” “Make your lead magnet more visible by placing it on the home page, in the header, or as an exit-intent popup.”

4 “Good lead magnet with clear value. However, the form has {number} fields, which may reduce conversion.” “Consider reducing the number of fields to just first name and email. Each additional field reduces conversion by about 10%.”  

### Category 5: Form Design & Friction (Weight: ×1.0)

**What is analyzed:**

Signal Looking for Score impact

Minimal number of fields Only necessary fields +1

Clear field labels Clear what to fill in +1

Good error handling Clear error messages +1

Action-oriented button Not generic “Submit” +1

Visual clarity Clean, clear form +1  

**Negative signals:**

-   Many fields (>5 for contact forms)
-   Mandatory fields that are not needed
-   Generic buttons (“Send,” “Submit”)
-   Unclear field labels
-   CAPTCHA as the first obstacle

**Granular problem tags:**

-   `too_many_form_fields`– Too many fields
-   `unnecessary_required_fields`– Unnecessary mandatory fields
-   `generic_submit_button`– Generic submit button
-   `unclear_field_labels`– Unclear field labels
-   `no_field_validation`– No real-time validation
-   `captcha_friction`– CAPTCHA creates friction
-   `form_visually_cluttered`– Form visually cluttered

**Sample texts per score level:**

Score Problem text Recommendation

1 “Your contact form has {number} fields, which creates significant friction. Studies show that each additional field reduces conversion by ~10%.” "Review each field and ask: 'Is this absolutely necessary for follow-up? Keep only name, email, and possibly a message field. Collect other information later in the sales process.“

2 ”Your form uses the button ‘{button text}’, which is generic and does not motivate action.“ ”Change to an action-oriented button text that communicates value: ‘Get my response within 24 hours’, ' Send my request', or ‘Book my free call’.“

3 ”The form works but lacks visual cues to help the user. Field labels and instructions could be clearer. “ ”Add placeholder text that shows examples, such as ‘namn@företag.se’. Also consider showing which fields are mandatory with an asterisk (*).“

4 ”Good form with few fields, but it could be improved with better error handling.“ ”Add real-time validation that shows whether the email address is valid as the user types. Display clear, friendly error messages."  

### Category 6: Risk Minimization & Guarantees (Weight: ×1.0)

**What is analyzed:**

Signal Looking for Impact on score

Guarantee exists Satisfaction guarantee, money-back guarantee, etc. +1

Visible placement Guarantee easy to find, not hidden +1

Bold wording Confident tone that signals trust +1

Easy to understand Clear terms without legal jargon +1

Justified Explanation of why the guarantee is offered +1  

**Negative signals:**

-   No guarantee at all
-   Guarantee hidden in footer/terms and conditions
-   Short guarantee periods
-   Complicated terms and conditions
-   Defensive wording

**Granular problem tags:**

-   `no_guarantee`– No guarantee found
-   `guarantee_hidden`– Guarantee hidden (footer, terms and conditions page)
-   `guarantee_short_duration`– Short guarantee period
-   `guarantee_complex_terms`– Complicated terms
-   `guarantee_weak_language`– Weak, defensive wording
-   `no_risk_reversal`– No risk minimization whatsoever

**Sample texts per score level:**

Score Problem text Recommendation

1 "We found no guarantee on your website. Without risk minimization, the customer bears all the uncertainty, which is a significant barrier to conversion.“ ”Introduce a clear guarantee and place it prominently on the home page and near your CTAs. Example: ‘Not satisfied? Money back within 30 days – no questions asked.’ A strong guarantee signals that you believe in your product.“

2 ”You have a guarantee, but it is hidden {where it was found}. Most visitors will never see it.“ ”Highlight the guarantee on the home page and near decision points. A guarantee that no one sees has no effect on conversion."

3 “Your guarantee is visible, but the wording is defensive or the terms are complicated, which reduces its confidence-building effect.” “Simplify the wording and make it more confident. Instead of ‘Under certain circumstances, we may...’ – write ‘We guarantee you'll be satisfied. If not, you'll get your money back. Period.’”

4 “Good guarantee in place, but you could reinforce it by explaining WHY you dare to offer it.” “Add a sentence that explains your confidence: ‘We dare to offer this guarantee because 97% of our customers are satisfied.’”  

### Category 7: Urgency & Scarcity (Weight: ×0.75)

**What is analyzed:**

Signal Looking for Impact on score

Time limit Offers with a deadline +1

Quantity limit Limited number, few places left +1

Social activity “X people are viewing right now,” “Last purchased 2 minutes ago” +1

Price incentive Discount for quick action +1

Authenticity Urgency/scarcity feels genuine +1  

**NOTE:**  This category is often neutral for service companies. If no urgency elements are found, give 3/5 with recommendation.

**Granular problem tags:**

-   `no_urgency_elements`– No urgency elements (neutral, not critical)
-   `fake_urgency`– Urgency that feels fabricated
-   `missed_urgency_opportunity`– Natural scarcity that is not communicated
-   `weak_urgency_copy`– Weak urgency text without substance

**Sample texts per score level:**

Score Problem text Recommendation

3 (neutral) “We found no elements that create urgency or scarcity on your website. This is not necessarily a problem, but it may be a missed opportunity.” "Consider whether you have natural limitations you can communicate: limited places, seasonal offers, or price increases. If you offer consultations, you could, for example, display ‘Only 3 slots available this week’.“

2 ”You use urgency elements (‘{element}’) that feel generic or fabricated. False urgency can damage trust.“ ”If you are going to use urgency, make sure it is genuine and substantial. A ‘limited-time offer’ without a deadline feels empty. Instead, specify: ‘Offer valid until {date}’.

4 “Good use of {element} to create motivation to act. It feels authentic and relevant.” “Continue with the current approach. Consider testing different formulations to optimize the effect.”  

### Category 8: Process clarity / Future-Pacing (Weight: ×1.0)

**What is analyzed:**

Signal Looking for Impact on score

Next steps explained Clear explanation of what happens after conversion +1

Entire process shown Step-by-step from contact to delivery +1

Visual aids Flowcharts, icons, numbered steps +1

Time expectations How long does it take? When will I get a response? +1

Support options Clearly states how the customer can get help +1  

**Negative signals:**

-   No information about what happens after purchase/contact
-   Unclear time frames
-   No “How it works” section
-   Contact information difficult to find

**Granular problem tags:**

-   `no_process_explanation`– No explanation of the process
-   `no_next_step_info`– Unclear what happens next
-   `no_timeline_info`– No time expectations
-   `no_visual_process`– No visual explanation of the process
-   `contact_info_hidden`– Contact information difficult to find
-   `no_support_info`– Unclear how to get help

**Sample texts per score level:**

Score Problem text Recommendation

1 “It is not clear what happens after a visitor makes contact. This uncertainty can be a significant barrier to taking the next step.” "Add a ‘How it works’ section that explains the process step by step. Example: ‘1. You fill out the form → 2. We call you within 24 hours → 3. Together we develop a plan → 4. We get started’.“

2 ”You have some process information, but it is vague or incomplete. The visitor does not know how long things will take.“ ”Add specific time frames: ‘Response within 24 hours’, ‘Delivery in 3-5 business days’, etc. Specificity builds trust.“

3 ”Basic process information is available, but it could be visualized more clearly.“ ”Consider creating a visual step-by-step guide with icons or a simple flowchart. Visual information is easier to absorb."

4 “Good process explanation with clear steps and timeframes. Consider adding what the customer can expect at each step.” “Elaborate on each step with what the customer can expect: ‘In the first call, we will go through your needs and answer your questions. This will take about 20 minutes.’”  

### Category 9: Content Architecture (Weight: ×0.75)

**What is analyzed:**

Signal Looking for Impact on score

Logical structure Content organized into clear sections +1

Scannability Headings, subheadings, short paragraphs +1

Progressive disclosure Accordions, “Read more,” expandable content +1

Visual hierarchy Clear indication of what is most important +1

Balanced length Sufficient but not overwhelming +1  

**Negative signals:**

-   Long blocks of text without headings
-   No clear visual hierarchy
-   Overwhelming amount of information
-   Or the opposite: too little information

**Granular problem tags:**

-   `poor_content_structure`– Poor content structure
-   `wall_of_text`– Long blocks of text without division
-   `no_visual_hierarchy`– Lacks visual hierarchy
-   `content_overwhelming`– Overwhelming amount of content
-   `content_too_sparse`– Too little content
-   `no_progressive_disclosure`– All info is displayed at once
-   `poor_scannability`– Difficult to scan the page

**Sample texts per score level:**

Score Problem text Recommendation

1 “Your home page presents information in long blocks of text without a clear structure. This makes it difficult for visitors to quickly find relevant information.” “Break up the text with clear headings, shorter paragraphs, and visual elements. A web page should be like a phone book – easy to find what you're looking for – not like a novel that has to be read from beginning to end.”

2 “There is some structure, but the visual hierarchy is unclear. It is difficult to determine what is most important.” “Use size, color, and placement to signal priority. The most important message should be the largest and at the top. Secondary information can be smaller and/or lower down.”

3 “Reasonable structure, but the page could use progressive disclosure to hide details until the visitor requests them.” “Consider using accordions for FAQ sections, ‘Read more’ links for detailed information, or tabs for different service areas. This makes the page more transparent.”

4 “Good content structure with a clear hierarchy. Some sections could be shortened for better balance.” “Review the longest sections and consider whether everything needs to be displayed immediately, or whether parts can be hidden behind ‘Read more’.”  

### Category 10: Offer Structure (Weight: ×1.0)

**What is analyzed:**

Signal Looking for Score impact

Low threshold Free trial period, free consultation, low starting price +1

Clear pricing Prices and what is included are transparent +1

Segmented options Different packages for different needs (Basic/Pro/Enterprise) +1

Bonuses/Premiums Extra value included +1

Value vs. cost Clearly communicated value relative to price +1  

**Negative signals:**

-   No “no-brainer” first step
-   Unclear pricing (must contact for price)
-   Only one option
-   No bonuses or added value

**Granular problem tags:**

-   `no_low_barrier_entry`– No easy first step
-   `pricing_not_transparent`– Unclear or missing pricing
-   `single_offering`– Only one option
-   `no_premiums`– No bonuses or extra value
-   `value_not_communicated`– Value not clear relative to price
-   `pricing_too_complex`– Too complex pricing structure

**Sample texts per point level:**

Points Problem text Recommendation

1 “Your offer lacks an easy first step. Visitors must commit to a purchase or a large investment right away.” “Create a ‘no-brainer’ offer with a low threshold: a free consultation, a trial period, or an introductory price. This reduces the risk for the visitor and increases the chance that they will make contact.”

2 “You do not display your prices, which can create uncertainty and suspicion among visitors.” “If possible, be transparent with pricing. If you have customized solutions, at least provide a ‘starting from’ price or a price range to give the visitor an idea.”

3 "Your offer exists but is presented as ‘one size fits all’. Different customers have different needs and budgets.“ ”Consider creating 2-3 packages or tiers (e.g., Starter, Pro, Premium) that cater to different segments. This maximizes revenue and makes it easier for customers to find the right tier.“

4 ”Good offer with a clear structure. Consider adding bonuses to increase the perceived value." “Is there anything extra you can include at no great cost? A guide, an extra service, priority support? Bonuses can be what makes a hesitant customer decide.”  

## 5. Teaser logic

### 5.1 What is displayed before registration

```
┌──────────────────────────────────────────────────── ─────┐
```

```
│                                                             │
```

```
│          Analysis ready for {url}                              │
```

```
│                                                             │
```

```
│    ┌────────────────────────────────────────────┐          │
```

```
│    │         OVERALL RATING                 │          │
```

```
│    │                                            │          │
```

```
│    │            {rating} / 5                     │          │
```

```
│    │         ████████░░░░░░░░░░                 │          │
```

```
│    │           “{rating_category}”               │          │
```

```
│    │                                            │          │
```

```
│    └────────────────────────────────────────────┘          │
```

```
│                                                             │
```

```
│    🔴 The biggest problems we found:                        │
```

```
│                                                             │
```

```
│    1. {category_with_lowest_score} ({score}/5)              │
```

```
│    2. {category_with_second_lowest_score} ({score}/5)         │
```

```
│    3. {category_with_third_lowest_score} ({score}/5)       │
```

```
│                                                             │
```

```
│    ┌────────────────────────────────────────────┐          │
```

```
│    │ 🔒 Register to see:             │          │
```

```
│    │    • Detailed problem descriptions      │          │
```

```
│    │    • Concrete solution proposals              │          │
```

```
│    │    • All 10 analyzed areas           │          │
```

```
│    │    • Downloadable PDF report           │          │
```

```
│    └──────────────────────────────────────── ────┘          │
```

```
│                                                             │
```

```
│         [  View my full report  ]                │
```

```
│                                                             │
```

```
└───────────────────────────────────────────────────────────── ┘
```

### 5.2 Logic for “Biggest problems”

1.  Sort all 10 categories by score (lowest first)
2.  Show the 3 with the lowest scores
3.  In case of equal scores, prioritize by weight (higher weight shown first)
4.  Show only category names and scores, NOT problem descriptions

## 6. Full Report

### 6.1 Report Structure

```
┌─────────────────────────────────────────────────────────────┐
```

```
│  📊 Conversion Analysis                                     │
```

```
│  {url}                                                      │
```

```
│  Generated: {date}                      [📥 Download PDF] │
```

```
├───────────────────────────────────────────────────────────── ┤
```

```
│                                                             │
```

```
│  OVERALL RATING                                         │
```

```
│                                                             │
```

```
│       {rating} / 5 - “{rating_category}”                     │
```

```
│       ████████████ ░░░░░░░░                                 │
```

```
│                                                             │
```

```
│  “{summary_2-3_sentences}”                           │
```

```
│                                                             │
```

```
├───────────────────────────────────────────────────────────── ┤
```

```
│                                                             │
```

```
│  🔴 CRITICAL ISSUES (score 1-2)                           │
```

```
│  ─────────────────────────                                  │
```

```
│                                                             │
```

```
│  [{category_icon}] {Category name} ({score}/5)              │
```

```
│  ┌─────── ────────────────────────────────────────┐         │
```

```
│  │ Problem: {problem description}                 │         │
```

```
│  │                                               │         │
```

```
│  │ Recommendation: {specific_action}             │         │
```

```
│  └───────────────────────── ──────────────────────┘         │
```

```
│                                                             │
```

```
│  [Repeat for each critical category]                     │
```

```
│                                                             │
```

```
├─────────────────────────────────────────────────────────────┤
```

```
│                                                             │
```

```
│  🟡 OPPORTUNITIES FOR IMPROVEMENT (score 3)                      │
```

```
│  ─────────────────────────────                              │
```

```
│                                                             │
```

```
│  [Expandable sections for each category]               │
```

```
│                                                             │
```

```
├───────────────── ────────────────────────────────────────────┤
```

```
│                                                             │
```

```
│  🟢 STRENGTHS (score 4-5)                                    │
```

```
│  ──────────────                                             │
```

```
│                                                             │
```

```
│  • {strength_1}                                              │
```

```
│  • {strength_2}                                              │
```

```
│                                                             │
```

```
├─────────────────────────────────────────────────────────────┤
```

```
│                                                             │
```

```
│  📋 PRIORITIZED ACTION LIST                               │
```

```
│  ────────────────────── ───────                              │
```

```
│                                                             │
```

```
│  □ {Action_1} (Critical)                                    │
```

```
│  □ {Action_2} (Critical)                                    │
```

```
│  □ {Action_3} (Important)                                     │
```

```
│  □ {Action_4} (Important)                                     │
```

```
│  □ {Action_5} (Improvement)                                │
```

```
│                                                             │
```

```
├────────────────────────────────────────────────────────── ───┤
```

```
│                                                             │
```

```
│  📞 NEXT STEP                                             │
```

```
│  ─────────────                                              │
```

```
│                                                             │
```

```
│  Would you like help implementing these improvements     │
```

```
│  and increasing your conversion rate?                                  │
```

```
│                                                             │
```

```
│  ┌─────────────── ────────────────────────────────┐         │
```

```
│  │    Book a review for increased conversion       │         │
```

```
│  │    → calendly.com/stefan-245/30min            │         │
```

```
│  └──────────────────────────────────────────── ───┘         │
```

```
│                                                             │
```

```
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Category icons

Category Icon

Value proposition 💎

Call to Action 🎯

Social Proof ⭐

Lead Magnets 🧲

Form Design 📝

Guarantees 🛡️

Urgency & Scarcity ⏰

Process Clarity 🗺️

Content Architecture 🏗️

Offer Structure 💰  

### 6.3 Categorization of Results

Score Category Color

1-2 Critical Issues 🔴 Red

3 Opportunities for Improvement 🟡 Yellow

4-5 Strengths 🟢 Green  

## 7. PDF Specifications

### 7.1 Basic Format

Property Value

Format A4 (210mm × 297mm)

Orientation Portrait

Theme Light (for printing)

Page numbers No

Margins 20mm  

### 7.2 Color scheme

Element Color

Heading H1  `#1a1a1a`(almost black)

Heading H2  `#333333`

Body text  `#444444`

Accent (buttons, links)  `#10B981`(green from the web app)

Critical background  `#FEE2E2`(light red)

Improvement background  `#FEF3C7`(light yellow)

Strength background  `#D1FAE5`(light green)  

### 7.3 Layout

```
┌─────────────────────────────────────────────────────────────┐
```

```
│  [LOGO]                                                  │
```

```
│  Portalfabriken                                            │
```

```
├───────────────────────────────────────────────────────────── ┤
```

```
│                                                             │
```

```
│  CONVERSION ANALYSIS                                        │
```

```
│  {url}                                                      │
```

```
│  Generated: {date}                                         │
```

```
│                                                             │
```

```
├───────────────────────────────────────────────────────────── ┤
```

```
│                                                             │
```

```
│  [CONTENT AS IN WEB VERSION]                            │
```

```
│                                                             │
```

```
├─────────────────────────────────────────────────────────────┤
```

```
│                                                             │
```

```
│  ──────────────────────────────────────── ───────────────   │
```

```
│                                                             │
```

```
│  Would you like help implementing these improvements?    │
```

```
│                                                             │
```

```
│  ┌───────────────────────────────────────────────┐         │
```

```
│  │    Book a review for increased conversion       │         │
```

```
│  │    https://calendly.com/stefan-245/30min      │         │
```

```
│  └───────────────────────────────────────────────┘         │
```

```
│                                                             │
```

```
│  ───────────────────────── ──────────────────────────────   │
```

```
│                                                             │
```

```
│  [LOGO]  Portalfabriken                                 │
```

```
│  This report was created by Lead Generation Conversion       │
```

```
│  Analyzer – portalfabriken.se/analysera                    │
```

```
│                                                             │
```

```
└─────────────────────────────── ──────────────────────────────┘
```

## 8. Admin Dashboard & Granular Problem Tags

### 8.1 Complete list of granular problem tags

**Value proposition:**

-   `unclear_headline`
-   `features_not_benefits`
-   `missing_usp`
-   `value_prop_too_complex`
-   `no_proof_points`

**Call to Action:**

-   `no_cta_found`
-   `cta_below_fold`
-   `generic_cta_text`
-   `low_contrast_cta`
-   `single_cta_placement`
-   `unclear_cta_destination`

**Social Proof:**

-   `no_social_proof`
-   `no_testimonials`
-   `anonymous_testimonials`
-   `no_client_logos`
-   `no_quantitative_proof`
-   `no third-party validation`
-   `social proof poor placement`

**Lead magnets:**

-   `no lead magnet`
-   `mailto link leak`
-   `open pdf leak`
-   `weak lead magnet value`
-   `lead magnet hidden`
-   `lead magnet too many fields`
-   `lead magnet irrelevant`

**Form design:**

-   `too many form fields`
-   `unnecessary_required_fields`
-   `generic_submit_button`
-   `unclear_field_labels`
-   `no_field_validation`
-   `captcha_friction`
-   `form_visually_cluttered`

**Guarantees:**

-   `no_guarantee`
-   `guarantee_hidden`
-   `guarantee_short_duration`
-   `guarantee_complex_terms`
-   `guarantee_weak_language`
-   `no_risk_reversal`

**Urgency & Scarcity:**

-   `no_urgency_elements`(neutral)
-   `fake_urgency`
-   `missed_urgency_opportunity`
-   `weak_urgency_copy`

**Process Clarity:**

-   `no_process_explanation`
-   `no_next_step_info`
-   `no_timeline_info`
-   `no_visual_process`
-   `contact_info_hidden`
-   `no_support_info`

**Content Architecture:**

-   `poor_content_structure`
-   `wall_of_text`
-   `no_visual_hierarchy`
-   `content_overwhelming`
-   `content_too_sparse`
-   `no_progressive_disclosure`
-   `poor_scannability`

**Offer Structure:**

-   `no_low_barrier_entry`
-   `pricing_not_transparent`
-   `single_offering`
-   `no_premiums`
-   `value_not_communicated`
-   `pricing_too_complex`

### 8.2 Admin Dashboard – Problem View

**Suggested improved view:**

```
┌─────────────────────────────────────────────────────────────┐
```

```
│  ⚠️ Most Common Problems                                   │
```

```
├─────────────────────────────────────────────────────────────┤
```

```
│                                                             │
```

```
│  CRITICAL (most occurrences)                              │
```

```
│  ┌───────────────────────────────────────────────── ────┐   │
```

```
│  │ no_lead_magnet: 45 instances          ████████████████     │   │
```

```
│  │ no_social_proof: 38 instances         ██ ███████████        │   │
```

```
│  │ generic_cta_text: 35 instances        ████████████         │   │
```

```
│  │ no_guarantee: 32 pcs            ███████████          │   │
```

```
│  └───────────────────────────────────────────────── ────┘   │
```

```
│                                                             │
```

```
│  LEAKING FUNNELS                                          │
```

```
│  ┌─────────────────────────────────────────────────────┐   │
```

```
│  │ mailto_link_leak: 28 items        ██ ████████           │   │
```

```
│  │ open_pdf_leak: 15 items           ██████               │   │
```

```
│  └────────────────────────────────────────────── ───────┘   │
```

```
│                                                             │
```

```
└─────────────────────────────────────────────────────────┘
```

## 9. Error handling

### 9.1 URL cannot be reached

**Scenario:**  The website is down, the URL is incorrect, or the page is blocking our request.

**Message:**

“We couldn't reach {url}.

This may be due to: • The URL is misspelled • The website is temporarily down • The website is blocking automatic requests

Check the URL and try again. If the problem persists, contact us and we will help you.”

### 9.2 Non-English website

**Scenario:**  The website is in a language other than English.

**Message:**

“It appears that {url} is not an English website.

Currently, we only support analysis of English-language websites. We are working on expanding to more languages.”

### 9.3 Analysis error

**Scenario:**  Something goes wrong during the analysis.

**Message:**

“Something went wrong when we analyzed {url}.

We have logged the error and are working to fix it. Please try again in a while, or contact us if the problem persists.”

## 10. Technical Notes

### 10.1 What to fetch from the website

-   Only the home page (no crawling of subpages)
-   HTML content
-   Meta tags
-   Visible text
-   Forms and their fields
-   Buttons and links
-   Images (to identify logos, icons)

### 10.2 AI analysis output format

The AI should return structured data in JSON format:

json

```
{
```

```
  “url”: “https://example.se”,
```

```
  “language”: “en”,
```

```
  “overall_score”: 2.8,
```

```
  ‘overall_category’: “Pass”,
```

```
“summary”: “Your website has the basics in place but...”,
```

```
  “categories”: [
```

```
    {
```

```
      “id”: “value_proposition”,
```

```
      ‘name’: “Clarity of Value Proposition”,
```

```
      “score”: 3,
```

```
“weight”: 2.0,
```

```
      “status”: “improvement”,
```

```
      “problems”: [
```

```
        {
```

```
          “tag”: “features_not_benefits”,
```

```
          “description”: “Your value proposition focuses on features...”,
```

```
          ‘recommendation’: “For each feature you mention...”
```

```
        }
```

```
],
```

```
      “evidence”: {
```

```
        “headline_found”: “Welcome to our company”,
```

```
        “benefits_found”: false,
```

```
        “usp_found”: false
```

```
      }
```

```
    }
```

_`// ... other categories`_

```
  ],
```

```
‘strengths’: [
```

```
    “Clear navigation and structure”,
```

```
“Professional design”
```

```
  ],
```

```
  “action_list”: [
```

```
    {
```

```
      “priority”: “critical”,
```

```
      “action”: “Add customer reviews to the home page”,
```

```
      ‘category’: “social_proof”
```

```
    }
```

_`// ... other actions`_

```
  ],
```

```
  “leaking_funnels”: [
```

```
    {
```

```
      “type”: “mailto_link_leak”,
```

```
      ‘location’: “Contact section”,
```

```
“details”: “mailto:info@example.se”
```

```
    }
```

```
  ]
```

```
}
```

## ✅ Specification Complete

This specification covers:

✅ All 10 analysis categories with detailed logic

✅ Weighted scoring system

✅ Teaser logic

1.  (show top 3 problems)
2.  ✅ Complete report structure
3.  ✅ PDF specification with branding
4.  ✅ 60+ granular problem tags for admin
5.  ✅ Error handling
6.  ✅ CTA for Portalfabriken

  

NOTE! All text on the application must be in Swedish.
