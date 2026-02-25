import { execute, seedDataInternal, wrapInTransaction } from '../db/dbSetup';
import { buyLotTransaction } from '../db/services/lotService';
import { finalizeAllocation } from '../db/services/allocationService';
import { advanceContractStage } from '../db/services/contractService';

export async function runSimulation() {
  console.log("🚀 Starting Full Simulation...");
  const report = {
    producers: [],
    farms: [],
    lots: [],
    clients: [],
    contracts: [],
    improvements: []
  };

  try {
    await wrapInTransaction(async () => {
      // 1. Actors
      const producerId = `prod-sim-${Date.now()}`;
      await execute("INSERT INTO producers (id, name, relationship) VALUES (?, ?, ?)", [producerId, "Finca Simulation", "Direct Trade"]);
      report.producers.push("Finca Simulation");
      
      const farmId = `farm-sim-${Date.now()}`;
      await execute("INSERT INTO farms (id, producer_id, name, region, altitude_meters, location, certification) VALUES (?, ?, ?, ?, ?, ?, ?)", 
        [farmId, producerId, "La Sim", "Cusco", 1850, "Santa Teresa", "Organic"]);
      report.farms.push("La Sim");

      const clientIds = [`cli-sim-A-${Date.now()}`, `cli-sim-B-${Date.now()}`, `cli-sim-C-${Date.now()}`];
      const clientNames = ["Sim Client A", "Sim Client B", "Sim Client C"];
      for (let i=0; i<3; i++) {
        await execute("INSERT INTO clients (id, name, relationship, destination_country, destination_port, destination_city) VALUES (?, ?, ?, ?, ?, ?)", 
          [clientIds[i], clientNames[i], i === 0 ? "VIP" : "International", "Simulation", "SimPort", "SimCity"]);
        report.clients.push(clientNames[i]);
      }

      // 2. Buy Lots
      const varieties = ['Geisha', 'Caturra', 'Typica'];
      for (const v of varieties) {
        const res = await buyLotTransaction({
          farm_id: farmId,
          variety: v,
          process_method: "Washed",
          total_weight_kg: 400,
          base_farm_cost_per_kg: 10.0
        });
        report.lots.push({ variety: v, bags: res.numBags });
      }

      // 3. Cupping (Must exist for Available view)
      const dbLots = await execute("SELECT * FROM lots WHERE farm_id = ?", [farmId]);
      for (const lot of dbLots) {
        await execute(`INSERT INTO cupping_sessions (id, public_id, lot_id, cupper_name, cupping_date, total_score, final_score, primary_flavor_note) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
          [`cup-${lot.id}`, `QC-${lot.public_id}`, lot.id, "Sim Cupper", new Date().toISOString(), 88.5, 88.5, "Clean & Bright"]);
      }

      // 4. Contracts
      const availableBags = await execute("SELECT id, lot_id, weight_kg FROM bags WHERE status = 'Available'");
      
      // Contract A: 2 bags -> Final Destination
      const resA = await finalizeAllocation(clientIds[0], availableBags.slice(0, 2), { required_quality_score: 85 });
      await advanceContractStage(resA.contractId, 50); // Cora -> Export
      await advanceContractStage(resA.contractId, 150); // Export -> Import
      await advanceContractStage(resA.contractId, 100); // Import -> Final
      report.contracts.push({ id: resA.publicId, client: "Sim Client A", stage: "Final Destination" });

      // Contract B: 3 bags -> Port-Export
      const resB = await finalizeAllocation(clientIds[1], availableBags.slice(2, 5), { required_quality_score: 85 });
      await advanceContractStage(resB.contractId, 60); // Cora -> Export
      report.contracts.push({ id: resB.publicId, client: "Sim Client B", stage: "Port-Export" });

      // Contract C: 1 bag -> Cora
      const resC = await finalizeAllocation(clientIds[2], availableBags.slice(5, 6), { required_quality_score: 85 });
      report.contracts.push({ id: resC.publicId, client: "Sim Client C", stage: "Cora" });

      report.improvements.push("Add bulk stage advancement for faster logistics simulation.");
      report.improvements.push("Automate cupping session creation after lot intake for faster verification.");
    });

    console.log("📊 SIMULATION REPORT:", JSON.stringify(report, null, 2));
    alert("Successful: Simulation Complete!\n\nCheck Console for full report.\n3 Contracts generated and staged.");
  } catch (e) {
    alert("Simulation Failed: " + e.message);
    console.error(e);
  }
}
