import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Set CORS headers for actual request
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  try {
    const { section, data } = req.body;

    // Validate input
    if (!section || !data) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing section or data' 
      });
    }

    // Generate prompt based on section
    const prompt = createPrompt(section, data);

    // Call OpenAI API with compatible model
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // This model supports JSON mode
      messages: [
        {
          role: "system",
          content: "You are a professional CV writing expert. Generate exactly 3 distinct, high-quality suggestions. Return them as a JSON object with this exact format: {\"suggestions\": [{\"option\": 1, \"text\": \"suggestion text\"}, {\"option\": 2, \"text\": \"suggestion text\"}, {\"option\": 3, \"text\": \"suggestion text\"}]}"
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
    let responseContent = completion.choices[0].message.content;
    let parsedResponse;
    
    try {
      parsedResponse = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Response content:', responseContent);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to parse AI response' 
      });
    }

    // Extract suggestions
    const suggestions = parsedResponse.suggestions || 
                       (Array.isArray(parsedResponse) ? parsedResponse : []);

    // Validate we have suggestions
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      return res.status(500).json({ 
        success: false,
        error: 'No suggestions generated' 
      });
    }
    
    return res.status(200).json({
      success: true,
      suggestions: suggestions
    });

  } catch (error) {
    console.error('Error:', error);
    
    // Handle specific OpenAI errors
    if (error.status) {
      return res.status(error.status).json({ 
        success: false,
        error: error.message || 'OpenAI API error',
        type: error.type || 'api_error'
      });
    }
    
    return res.status(500).json({ 
      success: false,
      error: 'Failed to generate suggestions',
      details: error.message
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
Return as JSON with "suggestions" array containing objects with "option" (number) and "text" (string) fields.`;

    case 'experience':
      return `Generate 3 professional descriptions for this work experience:
Job Title: ${data.jobTitle || 'Not specified'}
Company: ${data.company || 'Not specified'}
Duration: ${data.duration || 'Not specified'}
Responsibilities: ${data.responsibilities || 'Not specified'}

Each description should highlight achievements and impact using action verbs.
Return as JSON with "suggestions" array containing objects with "option" (number) and "text" (string) fields.`;

    case 'education':
      return `Generate 3 professional descriptions for this education:
Degree: ${data.degree || 'Not specified'}
Field: ${data.field || 'Not specified'}
University: ${data.university || 'Not specified'}
Achievements: ${data.achievements || 'Not specified'}

Each description should emphasize relevant coursework, projects, or achievements.
Return as JSON with "suggestions" array containing objects with "option" (number) and "text" (string) fields.`;

    case 'skills':
      return `Generate 3 professional skill descriptions for:
Technical Skills: ${data.technical || 'Not specified'}
Soft Skills: ${data.soft || 'Not specified'}
Tools/Technologies: ${data.tools || 'Not specified'}

Each description should be concise and highlight proficiency levels where relevant.
Return as JSON with "suggestions" array containing objects with "option" (number) and "text" (string) fields.`;

    case 'summary':
      return `Generate 3 professional CV summary statements for:
Job Title: ${data.jobTitle || 'Not specified'}
Years of Experience: ${data.yearsExperience || 'Not specified'}
Key Achievements: ${data.achievements || 'Not specified'}
Core Skills: ${data.coreSkills || 'Not specified'}

Each summary should be 3-4 sentences that capture career highlights and value proposition.
Return as JSON with "suggestions" array containing objects with "option" (number) and "text" (string) fields.`;

    default:
      return `Generate 3 professional CV suggestions for the ${section} section based on: ${JSON.stringify(data)}
Return as JSON with "suggestions" array containing objects with "option" (number) and "text" (string) fields.`;
  }
}
