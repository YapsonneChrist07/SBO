-- Each transporter has its own tariff. The primary key was (trajectID, weightLimitID),
-- which allowed only one cost per route and weight bracket across ALL transporters:
-- a second transporter saving a rate would overwrite the first one's.
-- Existing rows are unaffected (they all belong to one transporter).

ALTER TABLE `transportercostpertraject`
  DROP PRIMARY KEY,
  ADD PRIMARY KEY (`trajectID`, `weightLimitID`, `transporterID`);
