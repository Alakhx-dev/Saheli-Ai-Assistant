export async function generateChatTitle(firstMessage: string): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama3-8b-8192',
      max_tokens: 12,
      messages: [{
        role: 'user',
        content: `User ne yeh message bheja: "${firstMessage}"
Iska ek chhota, meaningful chat title do — max 4 words, Hinglish mein.
Sirf title do, kuch aur mat likho.`
      }]
    })
  });
  const data = await response.json();
  const title = data.choices?.[0]?.message?.content?.trim();
  return title || firstMessage.slice(0, 30);
}