// Dashboard route
app.get("/api/nurseries/:id/dashboard", async (req, res) => {
  try {
    const nurseryId = req.params.id;
    const nursery = await Nursery.findById(nurseryId)
      .populate("classes")
      .populate("workers");

    if (!nursery) return res.status(404).json({ success: false, message: "Nursery not found" });

    res.json({
      success: true,
      nursery: {
        id: nursery._id,
        name: nursery.name,
        email: nursery.email,
        phone: nursery.phone,
        passKey: nursery.passKey,
        manager: nursery.manager,
        managerPassKey: nursery.managerPassKey,
        classes: nursery.classes || [],
        workers: nursery.workers || []
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
