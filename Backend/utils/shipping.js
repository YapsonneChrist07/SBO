// Delivery prices for a customer order, from the transporters' published tariffs
// (transportercostpertraject: one price per route and weight bracket, in FCFA).
//
// - Route: SBO ships from Côte d'Ivoire, so the traject is the one whose destination is the
//   country of the delivery city (city → region → country, matched on the French name).
// - Weight: sum of product.weight × quantity, in kg. The price is that of the transporter's
//   smallest bracket that fits it. Heavier orders are split into parcels of the
//   transporter's largest bracket, plus one parcel for the rest.
// - Currency: the shop is in euros; the franc CFA is pegged to it at a fixed rate.
// Only approved transporters with an active contact (someone to hand the delivery to) are offered.

const FCFA_PER_EUR = 655.957;
const toEuros = (fcfa) => Math.round((fcfa / FCFA_PER_EUR) * 100) / 100;

// rates: [{ weightMax, transportCost }] sorted by weightMax. Returns the FCFA price or null.
const priceForWeight = (rates, weight) => {
  const largest = rates[rates.length - 1];
  const bracketFor = (w) => rates.find((r) => w <= r.weightMax);
  const fullParcels = Math.floor(weight / largest.weightMax);
  const rest = weight - fullParcels * largest.weightMax;
  let price = fullParcels * largest.transportCost;
  if (rest > 0 || fullParcels === 0) price += bracketFor(rest).transportCost;
  return price;
};

// Returns { weight, country, options: [{ transporterID, name, contactID, cost, costFCFA }] }
// with the cheapest option first. `country` is null when the city's country is unknown,
// and options is empty when no transporter delivers there.
const shippingOptions = async (conn, { cityID, items }) => {
  const productIDs = [...new Set(items.map((i) => i.productID))];
  const [products] = productIDs.length
    ? await conn.query('SELECT productID, weight FROM product WHERE productID IN (?)', [productIDs])
    : [[]];
  const weights = new Map(products.map((p) => [p.productID, Number(p.weight) || 0]));
  const weight = Math.round(items.reduce((sum, i) => sum + (weights.get(i.productID) || 0) * Number(i.quantity), 0) * 1000) / 1000;

  const [[place]] = await conn.query(
    `SELECT co.frenchName AS country,
            (SELECT t.trajectID FROM traject t WHERE TRIM(t.destinationCountry) = TRIM(co.frenchName) LIMIT 1) AS trajectID
     FROM city ci
     JOIN region r ON r.regionID = ci.regionID
     JOIN country co ON co.countryID = r.countryID
     WHERE ci.cityID = ?`,
    [cityID]
  );
  if (!place?.trajectID) return { weight, country: place?.country || null, options: [] };

  const [rates] = await conn.query(
    `SELECT tr.transporterID, TRIM(tr.name) AS name, w.weightMax, c.transportCost,
            (SELECT tc.contactID FROM transportercontact tc
             WHERE tc.transporterID = tr.transporterID AND (tc.endedDate IS NULL OR tc.endedDate > NOW())
             ORDER BY tc.startedDate DESC LIMIT 1) AS contactID
     FROM transportercostpertraject c
     JOIN transporter tr ON tr.transporterID = c.transporterID AND tr.status = 'active'
     JOIN weightlimit w ON w.weightLimitID = c.weightLimitID
     WHERE c.trajectID = ? AND c.transportCost > 0 AND w.weightMax > 0
     ORDER BY tr.transporterID, w.weightMax`,
    [place.trajectID]
  );

  const byTransporter = new Map();
  for (const r of rates) {
    if (!r.contactID) continue;
    if (!byTransporter.has(r.transporterID)) {
      byTransporter.set(r.transporterID, { transporterID: r.transporterID, name: r.name, contactID: r.contactID, rates: [] });
    }
    byTransporter.get(r.transporterID).rates.push({ weightMax: Number(r.weightMax), transportCost: Number(r.transportCost) });
  }

  const options = [...byTransporter.values()].map(({ rates: transporterRates, ...t }) => {
    const costFCFA = priceForWeight(transporterRates, weight);
    return { ...t, costFCFA, cost: toEuros(costFCFA) };
  });
  options.sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
  return { weight, country: place.country, options };
};

module.exports = { shippingOptions, priceForWeight, toEuros, FCFA_PER_EUR };
