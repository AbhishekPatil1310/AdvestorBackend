const axios = require('axios');

async function uploadToSupabase(buffer, fileName, mimetype) {
  const { SUPABASE_URL, SUPABASE_KEY, SUPABASE_BUCKET } = process.env;

  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${fileName}`;
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${fileName}`;

  try {
    await axios.post(uploadUrl, buffer, {
      headers: {
        'Content-Type': mimetype,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'x-upsert': 'true',
      },
      timeout: 10000,
    });

    return publicUrl;
  } catch (err) {
    console.error('Supabase Upload Error:', {
      status: err?.response?.status,
      data: err?.response?.data,
      message: err.message
    });
    throw new Error('Failed to upload to Supabase');
  }
}

module.exports = { uploadToSupabase };
