import { pgPool } from "./db"; // Your pg Pool instance

async function seedApartmentMatrix() {
  const apartmentId = "a6aa61ab-7b0f-4a8a-a558-2847464bb70b";
  const pricePerNight = 1000.0;

  console.log("Starting day-by-day availability seeding...");

  // Generate date strings sequentially starting from today
  const availabilityRecords: any[] = [];
  const today = new Date();

  for (let i = 0; i < 30; i++) {
    const targetDate = new Date();
    targetDate.setDate(today.getDate() + i);

    // Format perfectly to YYYY-MM-DD
    const dateString = targetDate.toISOString().split("T")[0];
    availabilityRecords.push([
      apartmentId,
      dateString,
      "available",
      pricePerNight,
    ]);
  }

  const client = await pgPool.connect();

  try {
    await client.query("BEGIN");

    // Build a dynamic bulk multi-row insert query string
    // e.g. INSERT INTO ... VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)...
    const valuePlaceholders = availabilityRecords
      .map(
        (_, index) =>
          `($${index * 4 + 1}, $${index * 4 + 2}, $${index * 4 + 3}, $${index * 4 + 4})`,
      )
      .join(", ");

    const queryText = `
      INSERT INTO apartment_availability (apartment_id, date, status, price_per_night)
      VALUES ${valuePlaceholders}
      ON CONFLICT (apartment_id, date) DO NOTHING;
    `;

    const flatValues = availabilityRecords.flat();
    await client.query(queryText, flatValues);

    await client.query("COMMIT");
    console.log(
      `[Seeder Success] Generated 30 days of availability slots for apartment: ${apartmentId}`,
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[Seeder Failure] Rollback triggered:", error);
  } finally {
    client.release();
    await pgPool.end(); // Close the pool so the node script exits clean
  }
}

seedApartmentMatrix();
