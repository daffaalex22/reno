/**
 * Test script for wan2.2-kf2v-flash AI model
 * This model generates video frames between a first frame and last frame
 */

interface Wan2_1_KF2V_Plus_Request {
  /** URL of the first frame image (360-2000px, max 10MB) */
  first_frame_url: string;
  /** URL of the last frame image (360-2000px, max 10MB) */
  last_frame_url: string;
  /** Text prompt describing the video (optional, max 800 chars) */
  prompt?: string;
  /** Negative prompt - things to avoid (optional, max 500 chars) */
  negative_prompt?: string;
  /** Enable prompt rewriting for better results (default: true) */
  prompt_extend?: boolean;
  /** Add watermark to video (default: false) */
  watermark?: boolean;
  /** Seed for reproducibility (0-2147483647) */
  seed?: number;
}

interface Wan2_1_KF2V_Plus_Response {
  /** URL of the generated video */
  output_video?: string;
  /** Task ID for polling status */
  task_id?: string;
  /** Status of the generation */
  task_status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  /** Error message if failed */
  error?: string;
  /** Request ID for tracking */
  request_id?: string;
}

/**
 * Configuration for the API call
 * Update these values based on your provider's documentation
 */
const CONFIG = {
  // API endpoint for video synthesis (Singapore region)
  API_URL: 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/image2video/video-synthesis',
  // Task status polling endpoint
  TASK_URL: 'https://dashscope-intl.aliyuncs.com/api/v1/tasks',
  // Replace with your actual API key
  API_KEY: process.env.API_KEY || 'your_api_key_here',
  // Polling interval in milliseconds (recommended: 15 seconds)
  POLL_INTERVAL_MS: 15000,
  // Maximum polling attempts (24 hours / 15 seconds = 5760)
  MAX_POLL_ATTEMPTS: 5760,
};

/**
 * Call the wan2.2-kf2v-flash model to generate video
 */
async function generateVideo(
  request: Wan2_1_KF2V_Plus_Request
): Promise<Wan2_1_KF2V_Plus_Response> {
  const payload = {
    model: 'wan2.2-kf2v-flash',
    input: {
      first_frame_url: request.first_frame_url,
      last_frame_url: request.last_frame_url,
      prompt: request.prompt,
      negative_prompt: request.negative_prompt,
    },
    parameters: {
      resolution: '720P',
      prompt_extend: request.prompt_extend ?? true,
      watermark: request.watermark ?? false,
      seed: request.seed,
    },
  };

  console.log('Sending request to wan2.2-kf2v-flash...');
  console.log('First frame:', request.first_frame_url);
  console.log('Last frame:', request.last_frame_url);

  try {
    const response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.API_KEY}`,
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`);
    }

    const result = await response.json();
    console.log('Task created:', result);
    
    // Map the response to our interface
    return {
      task_id: result.output?.task_id,
      task_status: result.output?.task_status || 'PENDING',
      request_id: result.request_id,
    };

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw error;
  }
}

/**
 * Poll for task completion
 */
async function pollTaskStatus(
  taskId: string,
  intervalMs: number = CONFIG.POLL_INTERVAL_MS,
  maxAttempts: number = CONFIG.MAX_POLL_ATTEMPTS
): Promise<Wan2_1_KF2V_Plus_Response> {
  const pollUrl = `${CONFIG.TASK_URL}/${taskId}`;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`Polling attempt ${attempt}/${maxAttempts}...`);

    const response = await fetch(pollUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CONFIG.API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to poll task: HTTP ${response.status}`);
    }

    const result = await response.json();
    const taskStatus = result.output?.task_status;

    console.log(`Task status: ${taskStatus}`);
    
    // Debug: log full response structure
    if (taskStatus === 'SUCCEEDED') {
      console.log('Full response:', JSON.stringify(result, null, 2));
    }

    if (taskStatus === 'SUCCEEDED') {
      console.log('Task completed!');
      
      // Try different possible locations for the video URL
      const videoUrl = result.output?.output_video 
        || result.output?.video_url 
        || result.output?.url
        || result.output?.result;
      
      return {
        task_id: result.output?.task_id,
        task_status: 'SUCCEEDED',
        output_video: videoUrl,
        request_id: result.request_id,
      };
    }

    if (taskStatus === 'FAILED') {
      throw new Error(`Task failed: ${result.output?.message || 'Unknown error'}`);
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error('Polling timeout: Task did not complete in time');
}

/**
 * Main test function
 */
async function main() {
  // Replace with your actual image URLs
  const testRequest: Wan2_1_KF2V_Plus_Request = {
    first_frame_url: 'https://ik.imagekit.io/3gpl6goyi/ccv2_2025-12-26_MiniMax-M2.1_1998628173415194793_735ae1d4df609d07cc63719b1806b1ca473728e4c677911e770e0f4552cec518..jpeg',
    last_frame_url: 'https://ik.imagekit.io/3gpl6goyi/21952cdf7412412db90ae1db3f011ce3.png',
    prompt: 'A cinematic room renovation transformation sequence. The video showcases the dramatic before-to-after journey of a home makeover, with elegant camera movements revealing the stunning metamorphosis. Professional interior design aesthetics, warm ambient lighting gradually illuminating the renovated space, subtle dust particles dancing in sunbeams, smooth transitions highlighting key design elements like modern furniture placement, fresh paint, polished floors, and tasteful decor. The atmosphere conveys hope, renewal, and the beauty of transformation. Slow, deliberate pacing with a reveal-style narrative structure, emphasizing the contrast between the old and new space.', // Optional but recommended
    negative_prompt: 'people', // Optional: things to avoid
    prompt_extend: true, // Enable prompt rewriting for better results
    watermark: false, // Set to true to add watermark
    seed: 42, // Optional: for reproducible results
  };

  try {
    // Step 1: Submit the generation request
    const response = await generateVideo(testRequest);

    // Step 2: Poll for task completion
    if (response.task_id) {
      console.log(`Task submitted with ID: ${response.task_id}`);
      const finalResult = await pollTaskStatus(response.task_id);
      console.log('Final result:', finalResult);
      
      if (finalResult.output_video) {
        console.log('Video URL:', finalResult.output_video);
        console.log('Note: Video URL is valid for 24 hours. Download it promptly!');
      }
    } else {
      console.log('No task ID received:', response);
    }

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run the test
main();

// Export for use as a module
export { generateVideo, pollTaskStatus, Wan2_1_KF2V_Plus_Request, Wan2_1_KF2V_Plus_Response };
