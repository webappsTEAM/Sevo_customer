const fs = require('fs');
const http = require('http');

// Let's query `/api/catalog/services/` from the local server
http.get('http://localhost:8000/api/catalog/services/', (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      const dbPackages = data.data.filter(p => p.category_slug === "mason" || String(p.category) === "11");
      console.log("Total DB Packages:", dbPackages.length);

      // Simulate MASON_CATEGORIES
      const distinct = [];
      dbPackages.forEach(pkg => {
        const rawSlug = pkg.service_slug || "brick-block-work";
        let cId = rawSlug;
        if (rawSlug === "brick-block-work") cId = "brick";
        else if (rawSlug === "plastering-wall-repair") cId = "plastering";
        else if (rawSlug === "wall-partition-construction") cId = "partition";
        else if (rawSlug === "wall-breaking-demolition") cId = "demolition";
        
        const sName = pkg.service_name || "Masonry Work";
        if (!distinct.some(c => c.id === cId)) {
          distinct.push({ id: cId, name: sName });
        }
      });
      console.log("Categories found:", distinct);

      // Simulate MASON_SERVICES
      const mappedServices = dbPackages.map(pkg => {
        const rawSlug = pkg.service_slug || "brick-block-work";
        let cId = rawSlug;
        if (rawSlug === "brick-block-work") cId = "brick";
        else if (rawSlug === "plastering-wall-repair") cId = "plastering";
        else if (rawSlug === "wall-partition-construction") cId = "partition";
        else if (rawSlug === "wall-breaking-demolition") cId = "demolition";
        return {
          id: pkg.slug || pkg.id.toString(),
          catId: cId,
          name: pkg.name
        };
      });

      console.log("\nMapped Services list:");
      mappedServices.forEach(s => {
        console.log(`- Name: ${s.name} | catId: ${s.catId}`);
      });

      // Filter check for each category
      distinct.forEach(cat => {
        const filtered = mappedServices.filter(s => s.catId === cat.id);
        console.log(`\nFiltered Services for catId "${cat.id}":`, filtered.length);
        filtered.forEach(s => console.log(`  * ${s.name}`));
      });

    } catch (e) {
      console.error(e);
    }
  });
}).on('error', (e) => {
  console.error("HTTP error:", e);
});
