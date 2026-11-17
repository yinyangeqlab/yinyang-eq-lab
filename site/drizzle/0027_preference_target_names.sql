-- Name changes must invalidate all cached target/ranking labels too.
DROP TRIGGER IF EXISTS ranking_revision_targets;
CREATE TRIGGER ranking_revision_targets AFTER UPDATE OF status,points,measurement,name,creator ON targets BEGIN UPDATE ranking_revision SET revision=revision+1 WHERE id=1; END;
UPDATE targets SET name = 'YinYang EQ Preference Target I', creator = 'YinYang EQ Lab' WHERE id = '80814769-6c61-4d24-801b-d80c20c1d5f4';
UPDATE targets SET name = 'YinYang EQ Preference Target II', creator = 'YinYang EQ Lab' WHERE id = '7a8ee296-ac62-4e56-b413-0b1042e9f46f';
UPDATE targets SET name = 'YinYang EQ Preference Target II (rev. 2)', creator = 'YinYang EQ Lab' WHERE id = 'fefbaa8f-563f-4c1b-ace9-74b299afa2fe';
