/**
 * Person research via Brave Search + OpenAI.
 */

'use strict';

const OpenAI = require('openai');

let openai = null;

/**
 * Create the OpenAI client on first research call so api-server.js can load
 * without OPENAI_API_KEY (tests and local API usage that never hit research).
 * @returns {OpenAI}
 */
function getOpenAI() {
    if (!openai) {
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }
    return openai;
}

/**
 * Search the public web via Brave Search.
 * @param {string} query
 * @returns {Promise<object[]>}
 */
async function searchBrave(query) {
    const apiKey = process.env.BRAVE_API_KEY;
    if (!apiKey) {
        throw new Error('BRAVE_API_KEY environment variable is required');
    }

    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10&search_lang=en`;

    const response = await fetch(url, {
        headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip',
            'X-Subscription-Token': apiKey
        }
    });

    if (!response.ok) {
        throw new Error(`Brave Search API error: ${response.status}`);
    }

    const data = await response.json();
    return data.web?.results || [];
}

/**
 * Build a research dossier for outreach.
 * @param {{name: string, company: string, context?: string}} params
 * @returns {Promise<object>}
 */
async function researchPerson({ name, company, context = '' }) {
    const queries = [
        `"${name}" "${company}"`,
        `${name} ${company} LinkedIn profile OR site:linkedin.com`,
        `${name} ${company} articles OR blog OR "thought leadership"`,
        `${name} ${company} twitter OR x.com/in OR "recent posts"`,
        `${name} ${company} news OR "speaking engagement" OR conference`
    ];

    const searchResults = await Promise.all(
        queries.map(query => searchBrave(query))
    );

    const relevantResults = searchResults
        .flat()
        .filter(r => r.url && (r.url.includes('linkedin.com') || r.url.includes(company.toLowerCase()) || r.description.toLowerCase().includes(name.toLowerCase())))
        .slice(0, 15)
        .map(r => `Title: ${r.title}\nDescription: ${r.description}\nURL: ${r.url}\n\n`)
        .join('');

    const systemPrompt = 'You are a professional researcher creating outreach dossiers. Be factual, concise, actionable.';

    const userPrompt = `Create a structured research dossier for outreach to:\n\nName: ${name}\nCompany: ${company}\nContext: ${context}\n\nSearch results:\n${relevantResults || 'No relevant public info found.'}\n\nOutput ONLY valid JSON with this exact structure:\n{\n  "bio": "2-3 sentence professional summary",\n  "role": "Current title and key responsibilities (from LinkedIn/company)",\n  "linkedin_url": "Direct LinkedIn profile URL if found, else null",\n  "interests": ["Interest 1", "Interest 2", "Interest 3"],\n  "recent_activity": [\n    {\n      "title": "Post/Article/Event",\n      "date": "YYYY-MM-DD or 'Recent'",\n      "url": "link",\n      "summary": "1 sentence"\n    }\n  ],\n  "mutual_connections": "Any mentioned mutuals or alumni, else 'None found'",\n  "talking_points": [\n    "Point 1: personalized opener",\n    "Point 2: common ground",\n    "Point 3: value proposition",\n    "Point 4: call to action"\n  ]\n}`;

    const completion = await getOpenAI().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
    });

    return JSON.parse(completion.choices[0].message.content);
}

module.exports = { researchPerson };
