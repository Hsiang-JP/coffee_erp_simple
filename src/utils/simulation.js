import { execute, seedDataInternal, wrapInTransaction } from '../db/dbSetup';
import { buyLotTransaction } from '../db/services/lotService';
import { finalizeAllocation } from '../db/services/allocationService';
import { advanceContractStage } from '../db/services/contractService';

export async function runSimulation() {
  console.log("🚀 Starting Full Simulation...");
  try {
    await wrapInTransaction(async () => {
      // 1. Reset Data (Optional, but good for clean slate)
      // We assume the user has clicked "Delete All" if they want a fresh start, 
      // but let's just add new data on top to simulate ongoing operations.
      
      // 2. Create Actors
      const producerId = `prod-sim-${Date.now()}`;
      await execute("INSERT INTO producers (id, name, relationship) VALUES (?, ?, ?)", [producerId, "Finca Simulation", "Direct Trade"]);
      
      const farmId = `farm-sim-${Date.now()}`;
      await execute("INSERT INTO farms (id, producer_id, name, region, altitude_meters, location, certification) VALUES (?, ?, ?, ?, ?, ?, ?)", 
        [farmId, producerId, "La Sim", "Cusco", 1850, "Santa Teresa", "Organic"]);

      const clientIds = [`cli-sim-A-${Date.now()}`, `cli-sim-B-${Date.now()}`, `cli-sim-C-${Date.now()}`];
      await execute("INSERT INTO clients (id, name, relationship, destination_country, destination_port, destination_city) VALUES (?, ?, ?, ?, ?, ?)", [clientIds[0], "Sim Client A", "VIP", "Japan", "Yokohama", "Tokyo"]);
      await execute("INSERT INTO clients (id, name, relationship, destination_country, destination_port, destination_city) VALUES (?, ?, ?, ?, ?, ?)", [clientIds[1], "Sim Client B", "International", "USA", "Oakland", "Seattle"]);
      await execute("INSERT INTO clients (id, name, relationship, destination_country, destination_port, destination_city) VALUES (?, ?, ?, ?, ?, ?)", [clientIds[2], "Sim Client C", "National", "Peru", "Callao", "Lima"]);

      // 3. Buy Lots (Intake)
      const varieties = ['Geisha', 'Caturra', 'Typica'];
      const lots = [];
      for (const v of varieties) {
        const res = await buyLotTransaction({
          farm_id: farmId,
          variety: v,
          process_method: "Washed",
          total_weight_kg: 300 + Math.random() * 200, // Random weight between 300-500kg
          base_farm_cost_per_kg: 8.0 + Math.random() * 4 // Random price
        });
        lots.push(res); // Contains lotPublicId, numBags (but not the bag IDs directly easily, we need to query)
        // Add Cupping Score to make them "Available" for high quality filters
        // Need lot_id. buyLotTransaction returns lotPublicId but we generated lotId inside.
        // Wait, buyLotTransaction only returns { success: true, lotPublicId, numBags }. 
        // I need the internal ID to insert cupping session.
        // Let's modify buyLotTransaction return or query it.
        // Querying is safer.
      }

      // Hack: We need the lot IDs to add cupping scores.
      const dbLots = await execute("SELECT * FROM lots WHERE farm_id = ?", [farmId]);
      
      for (const lot of dbLots) {
        await execute(`INSERT INTO cupping_sessions (id, public_id, lot_id, cupper_name, cupping_date, total_score, final_score, primary_flavor_note) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
          [`cup-${lot.id}`, `QC-${lot.public_id}`, lot.id, "Sim Cupper", new Date().toISOString(), 88.5, 88.5, "Simulation Note"]);
      }

      // 4. Create Contracts (Allocation)
      // We need available bags.
      const availableBags = await execute("SELECT * FROM bags WHERE status = 'Available'");
      
      // Contract A: 2 bags
      if (availableBags.length >= 2) {
        const bagsA = availableBags.slice(0, 2);
        const resA = await finalizeAllocation(clientIds[0], bagsA, {});
        console.log("Contract A created:", resA.publicId);
        
        // Advance Contract A to "Final Destination"
        await advanceContractStage(resA.contractId, 50); // Cora -> Export
        await advanceContractStage(resA.contractId, 150); // Export -> Import
        await advanceContractStage(resA.contractId, 100); // Import -> Final
      }

      // Contract B: 3 bags (if available)
      if (availableBags.length >= 5) {
        const bagsB = availableBags.slice(2, 5);
        const resB = await finalizeAllocation(clientIds[1], bagsB, {});
        console.log("Contract B created:", resB.publicId);
        // Leave B at "Processing" (or move partially)
        await advanceContractStage(resB.contractId, 60); // Cora -> Export
      }

       // Contract C: 1 bag (if available)
       if (availableBags.length >= 6) {
        const bagsC = availableBags.slice(5, 6);
        const resC = await finalizeAllocation(clientIds[2], bagsC, {});
        console.log("Contract C created:", resC.publicId);
      }

    });
    alert("Simulation Complete! 3 Contracts generated.");
  } catch (e) {
    alert("Simulation Failed: " + e.message);
    console.error(e);
  }
}
