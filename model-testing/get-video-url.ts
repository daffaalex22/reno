/**
 * Script to retrieve video URL from a completed task
 */

const CONFIG = {
  TASK_URL: 'https://dashscope-intl.aliyuncs.com/api/v1/tasks',
  API_KEY: process.env.API_KEY || 'sk-465ffc60a43343059ef673cb7857a3ee',
};

async function getTaskResult(taskId: string) {
  const pollUrl = `${CONFIG.TASK_URL}/${taskId}`;

  console.log(`Querying task: ${taskId}`);

  const response = await fetch(pollUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${CONFIG.API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to query task: HTTP ${response.status}`);
  }

  const result = await response.json();
  console.log('Full response:', JSON.stringify(result, null, 2));

  const taskStatus = result.output?.task_status;
  console.log(`Task status: ${taskStatus}`);

  if (taskStatus === 'SUCCEEDED') {
    // Try different possible locations for the video URL
    const videoUrl = result.output?.output_video 
      || result.output?.video_url 
      || result.output?.url
      || result.output?.result
      || result.output?.video;
    
    if (videoUrl) {
      console.log('\n✅ Video URL found:');
      console.log(videoUrl);
      console.log('\n⚠️  Note: Video URL is valid for 24 hours. Download it promptly!');
    } else {
      console.log('\n⚠️  Video URL not found in expected fields. Check the full response above.');
    }
  } else if (taskStatus === 'FAILED') {
    console.log(`\n❌ Task failed: ${result.output?.message || 'Unknown error'}`);
  } else {
    console.log(`\n⏳ Task is still ${taskStatus}. Please wait and try again later.`);
  }
}

// Get task ID from command line argument or use the one provided
const taskId = process.argv[2] || 'b0261de9-6d10-4023-9a85-9f1a7224eadd';

getTaskResult(taskId).catch(error => {
  console.error('Error:', error instanceof Error ? error.message : error);
  process.exit(1);
});
