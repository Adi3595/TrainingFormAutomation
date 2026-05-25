// trainingController.js
const { sendManagerEmail } = require("../services/emailService");

exports.employeeResponseReceived = async (req, res) => {
  try {
    const { trainingId, employeeEmail, managerEmail } = req.body;

    if (!trainingId || !managerEmail) {
      return res.status(400).json({
        message: "trainingId and managerEmail are required"
      });
    }

    const managerFormLink = `http://localhost:3000/manager-form/${trainingId}`;

    await sendManagerEmail(managerEmail, managerFormLink);

    console.log("✅ Manager email triggered for training:", trainingId);

    return res.json({
      message: "Manager notified successfully"
    });

  } catch (error) {
    console.error("Error triggering manager email:", error);
    return res.status(500).json({
      message: "Failed to notify manager"
    });
  }
};