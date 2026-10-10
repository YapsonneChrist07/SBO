-- The legacy regions point to the wrong country: the Abidjan / Sud-Comoé regions (Plateau,
-- Grand-Bassam) to CNTY_1 (an unnamed row, "Afganistan" in French) and Centre (Yaoundé) to
-- CNTY_228 (an empty row). Checkout now looks up the delivery route (traject) from the
-- customer's country, so they must point to Côte d'Ivoire and Cameroon.

UPDATE `region` SET `countryID` = 'CNTY_50' WHERE `countryID` = 'CNTY_1';   -- Côte d'Ivoire
UPDATE `region` SET `countryID` = 'CNTY_38' WHERE `countryID` = 'CNTY_228'; -- Cameroun
