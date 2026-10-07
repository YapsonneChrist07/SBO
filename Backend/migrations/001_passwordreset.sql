-- Password reset tokens (forgot-password flow in auth.controller.js).
-- This table was created directly on the dev database and is not part of sbo.sql;
-- run this after importing sbo.sql on a fresh install.

CREATE TABLE IF NOT EXISTS `passwordreset` (
  `resetID` varchar(15) NOT NULL,
  `contactID` varchar(15) NOT NULL,
  `tokenHash` varchar(255) NOT NULL,
  `expiresAt` datetime NOT NULL,
  `used` tinyint(1) NOT NULL DEFAULT '0',
  `createdDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`resetID`),
  KEY `idx_passwordreset_contact` (`contactID`),
  KEY `idx_passwordreset_tokenHash` (`tokenHash`),
  CONSTRAINT `fk_passwordreset_contact` FOREIGN KEY (`contactID`) REFERENCES `contact` (`contactID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
