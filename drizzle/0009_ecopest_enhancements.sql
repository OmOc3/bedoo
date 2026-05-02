ALTER TABLE `user` ADD `deactivated_at` integer;
ALTER TABLE `user` ADD `deactivated_by` text;
ALTER TABLE `user` ADD `reactivated_at` integer;
ALTER TABLE `user` ADD `reactivated_by` text;

ALTER TABLE `reports` ADD `station_location` text;
ALTER TABLE `reports` ADD `pest_types` text;
