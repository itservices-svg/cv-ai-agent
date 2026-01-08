import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { section, data } = req.body;

    // Validate input
    if (!section || !data) {
      return res.status(400).json({ error: 'Missing section or data' });
    }

    // Generate prompt based on section
    const prompt = createPrompt(section, data);

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a professional CV writing expert. Generate exactly 3 distinct, high-quality suggestions. Return them as a JSON array with this format: [{\"option\": 1, \"text\": \"suggestion text\"}, {\"option\": 2, \"text\": \"suggestion text\"}, {\"option\": 3, \"text\": \"suggestion text\"}]"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.8,
      response_format: { type: "json_object" }
    });

    // Parse response
    const response = JSON.parse(completion.choices[0].message.content);
    
    return res.status(200).json({
      success: true,
      suggestions: response.suggestions || response
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to generate suggestions' 
    });
  }
}

// Create prompts for different CV sections
function createPrompt(section, data) {
  switch(section) {
    case 'objective':
      return `Generate 3 professional CV objective statements for:
Job Title: ${data.jobTitle || 'Not specified'}
Experience: ${data.experience || 'Not specified'}
Key Skills: ${data.skills || 'Not specified'}

Each objective should be 2-3 sentences, professional, and tailored to the role.
Return as JSON with "suggestions" array.`;

    case 'experience':
      return `Generate 3 professional descriptions for this work experience:
Job Title: ${data.jobTitle || 'Not specified'}
Company: ${data.company || 'Not specified'}
Duration: ${data.duration || 'Not specified'}
Responsibilities: ${data.responsibilities || 'Not specified'}

Each description should highlight achievements and impact using action verbs.
Return as JSON with "suggestions" array.`;

    case 'education':
      return `Generate 3 professional descriptions for this education:
Degree: ${data.degree || 'Not specified'}
Field: ${data.field || 'Not specified'}
University: ${data.university || 'Not specified'}
Achievements: ${data.achievements || 'Not specified'}

Each description should emphasize relevant coursework, projects, or achievements.
Return as JSON with "suggestions" array.`;

    default:
      return `Generate 3 professional CV suggestions for the ${section} section based on: ${JSON.stringify(data)}
Return as JSON with "suggestions" array.`;
  }
}