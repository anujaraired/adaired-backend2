import cron from "node-cron";
import Blog from "../models/blog.model";

// Schedule a cron job to run every minute to check for blogs to publish
const scheduleBlogs = () => {
  const task = cron.schedule(
    "* * * * *", 
    async () => {
      try {
        const now = new Date();
        // Find blogs that are scheduled and their publish date is in the past
        const blogsToPublish = await Blog.find({
          status: "scheduled",
          scheduledPublishDate: { $lte: now },
        });

        // Update each blog to "publish" status
        for (const blog of blogsToPublish) {
          await Blog.findByIdAndUpdate(
            blog._id,
            {
              status: "publish",
              scheduledPublishDate: null, 
            },
            { new: true }
          );
          console.log(`Blog "${blog.postTitle}" published successfully.`);
        }
      } catch (error: any) {
        console.error("Error in scheduled blog publishing:", error.message);
      }
    },
    {
      scheduled: true,
      timezone: "UTC", 
    }
  );

  // Start the cron job
  task.start();

  console.log("Blog scheduling cron job started.");
};

// Start the cron job when the server starts
scheduleBlogs();

export default scheduleBlogs;