-- Step 1: Delete all training purchase records except Jamie Scott and Claudia Benjamin
DELETE FROM purchases
WHERE product_id IN (SELECT id FROM products WHERE category = 'training')
AND person_id NOT IN (
  SELECT id FROM people WHERE lower(email) IN ('jamieanderson.scott@gmail.com','soulconversations24@gmail.com')
);

-- Step 2: Insert new people (deduplicated by email)
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'monika.kosmalska@gmail.com', 'Monika', 'Kosmalska', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'monika.kosmalska@gmail.com' OR lower(alt_email) = 'monika.kosmalska@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'alice.dnyr@gmail.com', 'Alice', 'Dunoyer', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'alice.dnyr@gmail.com' OR lower(alt_email) = 'alice.dnyr@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'heidij7529@gmail.com', 'Heidi', 'Omahoney', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'heidij7529@gmail.com' OR lower(alt_email) = 'heidij7529@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'sarchapman22@gmail.com', 'Sarah', 'Chapman', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'sarchapman22@gmail.com' OR lower(alt_email) = 'sarchapman22@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'emmeline_w@hotmail.com', 'Emmeline', 'Henderson', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'emmeline_w@hotmail.com' OR lower(alt_email) = 'emmeline_w@hotmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'emilykayeyoga@gmail.com', 'Emily', 'Kaye', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'emilykayeyoga@gmail.com' OR lower(alt_email) = 'emilykayeyoga@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'ginali91@hotmail.com', 'Gina', 'Li', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'ginali91@hotmail.com' OR lower(alt_email) = 'ginali91@hotmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'leelaotremba@hotmail.com', 'Leela', 'Otremba', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'leelaotremba@hotmail.com' OR lower(alt_email) = 'leelaotremba@hotmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'lornafultontherapy@gmail.com', 'Lorna', 'Fulton', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'lornafultontherapy@gmail.com' OR lower(alt_email) = 'lornafultontherapy@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'lucybyogalondon@gmail.com', 'Lucy', 'Bishop', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'lucybyogalondon@gmail.com' OR lower(alt_email) = 'lucybyogalondon@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'nadim_ahmeduk@yahoo.co.uk', 'Nadim', 'Ahmed', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'nadim_ahmeduk@yahoo.co.uk' OR lower(alt_email) = 'nadim_ahmeduk@yahoo.co.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'ninalstone213@gmail.com', 'Nina', 'Stone', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'ninalstone213@gmail.com' OR lower(alt_email) = 'ninalstone213@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'khouloud.atigue@gmail.com', 'Khouloud', 'Atigue', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'khouloud.atigue@gmail.com' OR lower(alt_email) = 'khouloud.atigue@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'eviechristopher5@gmail.com', 'Evie', 'Christopher', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'eviechristopher5@gmail.com' OR lower(alt_email) = 'eviechristopher5@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'mynameisyvonne@gmail.com', 'Yvonne', 'Lu', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'mynameisyvonne@gmail.com' OR lower(alt_email) = 'mynameisyvonne@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'nelemartens123@gmail.com', 'Nele', 'Martens', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'nelemartens123@gmail.com' OR lower(alt_email) = 'nelemartens123@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'nfawwad@gmail.com', 'Nour', 'Awad', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'nfawwad@gmail.com' OR lower(alt_email) = 'nfawwad@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'p.a.devries0@gmail.com', 'Petra', 'de Vries', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'p.a.devries0@gmail.com' OR lower(alt_email) = 'p.a.devries0@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'sterre-03@hotmail.nl', 'Sterre', 'Theunissen', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'sterre-03@hotmail.nl' OR lower(alt_email) = 'sterre-03@hotmail.nl'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'sya.hoeke@gmail.com', 'Sya', 'Hoeke', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'sya.hoeke@gmail.com' OR lower(alt_email) = 'sya.hoeke@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'giamby78@yahoo.it', 'Gianbattista', 'Vespucci', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'giamby78@yahoo.it' OR lower(alt_email) = 'giamby78@yahoo.it'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'ionastrebes@gmail.com', 'Iona', 'Strebel', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'ionastrebes@gmail.com' OR lower(alt_email) = 'ionastrebes@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'jansen.ccm@gmail.com', 'Charline', 'Jansen', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'jansen.ccm@gmail.com' OR lower(alt_email) = 'jansen.ccm@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'jironet@xs4all.nl', 'Karin', 'Jironet', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'jironet@xs4all.nl' OR lower(alt_email) = 'jironet@xs4all.nl'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'lagwinnett@gmail.com', 'Lisa', 'Gwinett', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'lagwinnett@gmail.com' OR lower(alt_email) = 'lagwinnett@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'mmjf@hotmail.nl', 'Melanie', 'Rademaekers', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'mmjf@hotmail.nl' OR lower(alt_email) = 'mmjf@hotmail.nl'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'pabagan@gmail.com', 'Pablo', 'Aguilar', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'pabagan@gmail.com' OR lower(alt_email) = 'pabagan@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'engelke.michele@gmail.com', 'Michele', 'Engelke', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'engelke.michele@gmail.com' OR lower(alt_email) = 'engelke.michele@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'hello@alicebowen.co.uk', 'Alice', 'Bowen', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'hello@alicebowen.co.uk' OR lower(alt_email) = 'hello@alicebowen.co.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'incircles2022@gmail.com', 'Mowgli', 'Myers', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'incircles2022@gmail.com' OR lower(alt_email) = 'incircles2022@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'jessicalouisehaig@outlook.com', 'Jessica', 'Haig', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'jessicalouisehaig@outlook.com' OR lower(alt_email) = 'jessicalouisehaig@outlook.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'johnjbrooker@hotmail.com', 'John', 'Brooker', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'johnjbrooker@hotmail.com' OR lower(alt_email) = 'johnjbrooker@hotmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'rosie@funkycactusyoga.co.uk', 'India Rose', 'Parton', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'rosie@funkycactusyoga.co.uk' OR lower(alt_email) = 'rosie@funkycactusyoga.co.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'sandrairastorza@yahoo.fr', 'Sandra', 'Irastorza', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'sandrairastorza@yahoo.fr' OR lower(alt_email) = 'sandrairastorza@yahoo.fr'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'sdversi@me.com', 'Sara', 'Versi', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'sdversi@me.com' OR lower(alt_email) = 'sdversi@me.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'tamara.fadli@gmail.com', 'Tamara', 'Fadhli', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'tamara.fadli@gmail.com' OR lower(alt_email) = 'tamara.fadli@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'tanyacruzyoga@gmail.com', 'Tanya', 'Cruz', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'tanyacruzyoga@gmail.com' OR lower(alt_email) = 'tanyacruzyoga@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'virginiabrix@aol.com', 'Virginia', 'Brix', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'virginiabrix@aol.com' OR lower(alt_email) = 'virginiabrix@aol.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'helyrosewellness@gmail.com', 'Hely', 'Phillips', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'helyrosewellness@gmail.com' OR lower(alt_email) = 'helyrosewellness@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'amyemcdonald01@gmail.com', 'Amy', 'McDonald', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'amyemcdonald01@gmail.com' OR lower(alt_email) = 'amyemcdonald01@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'selinanath@gmail.com', 'Selina', 'Nath-Gordon', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'selinanath@gmail.com' OR lower(alt_email) = 'selinanath@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'alex.lee.taylor@gmail.com', 'Alex', 'Taylor', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'alex.lee.taylor@gmail.com' OR lower(alt_email) = 'alex.lee.taylor@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'beverley.day@mac.com', 'Beverley', 'Day', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'beverley.day@mac.com' OR lower(alt_email) = 'beverley.day@mac.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'dg@marblesdesign.co.uk', 'Denise', 'Gaskell', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'dg@marblesdesign.co.uk' OR lower(alt_email) = 'dg@marblesdesign.co.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'framechloe@gmail.com', 'ChloÃ©', 'Frame', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'framechloe@gmail.com' OR lower(alt_email) = 'framechloe@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'mariareid63@hotmail.com', 'Maria', 'Reid', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'mariareid63@hotmail.com' OR lower(alt_email) = 'mariareid63@hotmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'mgbneves@gmail.com', 'Maria da Gloria', 'Neves', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'mgbneves@gmail.com' OR lower(alt_email) = 'mgbneves@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'momoiah@yahoo.com', 'Monica', 'Marini', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'momoiah@yahoo.com' OR lower(alt_email) = 'momoiah@yahoo.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'pamela_kaur@yahoo.co.uk', 'Pamela', 'Kaur', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'pamela_kaur@yahoo.co.uk' OR lower(alt_email) = 'pamela_kaur@yahoo.co.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'richard.luke.benson@gmail.com', 'Richard', 'Benson', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'richard.luke.benson@gmail.com' OR lower(alt_email) = 'richard.luke.benson@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'sammy@sammyrainbowfurnival.com', 'Sammy', 'Furnival', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'sammy@sammyrainbowfurnival.com' OR lower(alt_email) = 'sammy@sammyrainbowfurnival.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'tan.h.bristow@gmail.com', 'Tan', 'Bristow', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'tan.h.bristow@gmail.com' OR lower(alt_email) = 'tan.h.bristow@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'wisewomanhealings@gmail.com', 'Miranda', 'Neal', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'wisewomanhealings@gmail.com' OR lower(alt_email) = 'wisewomanhealings@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'kerrie.lambert@outlook.com', 'Kerrie', 'Lambert', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'kerrie.lambert@outlook.com' OR lower(alt_email) = 'kerrie.lambert@outlook.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'millyblewis@gmail.com', 'Amelia', 'Lewis', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'millyblewis@gmail.com' OR lower(alt_email) = 'millyblewis@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'charlie.eriksen@gmail.com', 'Charlie', 'Eriksen', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'charlie.eriksen@gmail.com' OR lower(alt_email) = 'charlie.eriksen@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'diana_geernaert@hotmail.com', 'Diana', 'Geermaert', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'diana_geernaert@hotmail.com' OR lower(alt_email) = 'diana_geernaert@hotmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'giangtruong63@gmail.com', 'Giang', 'Truong', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'giangtruong63@gmail.com' OR lower(alt_email) = 'giangtruong63@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'guro.broen@gmail.com', 'Guro', 'Broen', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'guro.broen@gmail.com' OR lower(alt_email) = 'guro.broen@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'hanna.harbouli@cygnific.com', 'Hanna', 'Harbouli', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'hanna.harbouli@cygnific.com' OR lower(alt_email) = 'hanna.harbouli@cygnific.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'hoferkova.romana@gmail.com', 'Romana', 'Hofervoka', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'hoferkova.romana@gmail.com' OR lower(alt_email) = 'hoferkova.romana@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'irene.lahde@outlook.com', 'Irene', 'Lahde', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'irene.lahde@outlook.com' OR lower(alt_email) = 'irene.lahde@outlook.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'joyduits@outlook.com', 'Joy', 'Duits', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'joyduits@outlook.com' OR lower(alt_email) = 'joyduits@outlook.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'shirleykraemer7@gmail.com', 'Shirley', 'Kraemer', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'shirleykraemer7@gmail.com' OR lower(alt_email) = 'shirleykraemer7@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'katherine@katherineinge.com', 'Katherine', 'Johnstone', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'katherine@katherineinge.com' OR lower(alt_email) = 'katherine@katherineinge.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'huebnerlindsey@gmail.com', 'Lindsey', 'Huebner', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'huebnerlindsey@gmail.com' OR lower(alt_email) = 'huebnerlindsey@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'issyluckyoga@gmail.com', 'Isabella', 'Luck', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'issyluckyoga@gmail.com' OR lower(alt_email) = 'issyluckyoga@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'midlifefb@hotmail.com', 'Francine', 'Allen', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'midlifefb@hotmail.com' OR lower(alt_email) = 'midlifefb@hotmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'pascalebarget@googlemail.com', 'Pascale', 'Barget', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'pascalebarget@googlemail.com' OR lower(alt_email) = 'pascalebarget@googlemail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'sushilla@sushilla.co.uk', 'Sushilla', 'Done', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'sushilla@sushilla.co.uk' OR lower(alt_email) = 'sushilla@sushilla.co.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'newmancom247@gmail.com', 'Lisa', 'Newman', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'newmancom247@gmail.com' OR lower(alt_email) = 'newmancom247@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'mcclintockemma@gmail.com', 'Emma', 'Mcclintock', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'mcclintockemma@gmail.com' OR lower(alt_email) = 'mcclintockemma@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'agni_malaika@yahoo.com', 'Agnieszka', 'Kucharska', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'agni_malaika@yahoo.com' OR lower(alt_email) = 'agni_malaika@yahoo.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'akalaurent@mac.com', 'Laurent', 'Chaumet', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'akalaurent@mac.com' OR lower(alt_email) = 'akalaurent@mac.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'asya.oflaherty@yahoo.co.uk', 'Asya', 'Oflaherty', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'asya.oflaherty@yahoo.co.uk' OR lower(alt_email) = 'asya.oflaherty@yahoo.co.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'veronika.quintyne@yahoo.co.uk', 'Veronika', 'Quintyne', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'veronika.quintyne@yahoo.co.uk' OR lower(alt_email) = 'veronika.quintyne@yahoo.co.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'amani_eke@yahoo.co.uk', 'Amani', 'Eke', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'amani_eke@yahoo.co.uk' OR lower(alt_email) = 'amani_eke@yahoo.co.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'bart@3cats.uk', 'Bart', 'Gorissen', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'bart@3cats.uk' OR lower(alt_email) = 'bart@3cats.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'e.a.channing@me.com', 'Elizabeth', 'Kirk-Channing', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'e.a.channing@me.com' OR lower(alt_email) = 'e.a.channing@me.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'ellewalsh@hotmail.com', 'Erin', 'Thorne', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'ellewalsh@hotmail.com' OR lower(alt_email) = 'ellewalsh@hotmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'emmagoldschmidt85@gmail.com', 'Emma', 'Watkins (Goldschmidt)', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'emmagoldschmidt85@gmail.com' OR lower(alt_email) = 'emmagoldschmidt85@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'estherpettinger@gmail.com', 'Esther', 'Pettinger', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'estherpettinger@gmail.com' OR lower(alt_email) = 'estherpettinger@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'helenannem879@yahoo.co.uk', 'Helen', 'Mortimer', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'helenannem879@yahoo.co.uk' OR lower(alt_email) = 'helenannem879@yahoo.co.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'helenrussellclark@hotmail.com', 'Helen', 'Russell-Clark', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'helenrussellclark@hotmail.com' OR lower(alt_email) = 'helenrussellclark@hotmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'info@katehughesmeditation.co.uk', 'Kate', 'Hughes', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'info@katehughesmeditation.co.uk' OR lower(alt_email) = 'info@katehughesmeditation.co.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'maracimatorib@gmail.com', 'Mara', 'Cimatoribus', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'maracimatorib@gmail.com' OR lower(alt_email) = 'maracimatorib@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'nicola@nicolapott.co.uk', 'Nicola', 'Pott', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'nicola@nicolapott.co.uk' OR lower(alt_email) = 'nicola@nicolapott.co.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'nikkiessential@hotmail.com', 'Nicola', 'Ladd', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'nikkiessential@hotmail.com' OR lower(alt_email) = 'nikkiessential@hotmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'stephcowton@gmail.com', 'Stephanie', 'Cowton', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'stephcowton@gmail.com' OR lower(alt_email) = 'stephcowton@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'yogawithdianasaline@gmail.com', 'Diana', 'Saline', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'yogawithdianasaline@gmail.com' OR lower(alt_email) = 'yogawithdianasaline@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'fra.giustetti@gmail.com', 'Francesca', 'Giustetti', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'fra.giustetti@gmail.com' OR lower(alt_email) = 'fra.giustetti@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'abirmuhtasib@hotmail.com', 'Abir', 'Diamantaras', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'abirmuhtasib@hotmail.com' OR lower(alt_email) = 'abirmuhtasib@hotmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'hart_k@hotmail.com', 'Katherine', 'Hart', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'hart_k@hotmail.com' OR lower(alt_email) = 'hart_k@hotmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'julietclark@tiscali.co.uk', 'Juliet', 'Clark', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'julietclark@tiscali.co.uk' OR lower(alt_email) = 'julietclark@tiscali.co.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'lornacw11@gmail.com', 'Lorna', 'Campbell-williams', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'lornacw11@gmail.com' OR lower(alt_email) = 'lornacw11@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'mollietolino@outlook.com', 'Mollie', 'Tolino', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'mollietolino@outlook.com' OR lower(alt_email) = 'mollietolino@outlook.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'amy.hale2020@gmail.com', 'Amy', 'Hale', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'amy.hale2020@gmail.com' OR lower(alt_email) = 'amy.hale2020@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'maireadteresalucy@gmail.com', 'Mairead', 'Boland', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'maireadteresalucy@gmail.com' OR lower(alt_email) = 'maireadteresalucy@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'nourished_soul_yoga@hotmail.com', 'Jennifer', 'Hollins', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'nourished_soul_yoga@hotmail.com' OR lower(alt_email) = 'nourished_soul_yoga@hotmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'pat@theintelligentbody.co.uk', 'Patty', 'Penny', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'pat@theintelligentbody.co.uk' OR lower(alt_email) = 'pat@theintelligentbody.co.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'maryannefurey@gmail.com', 'Maryanne', 'Furey', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'maryannefurey@gmail.com' OR lower(alt_email) = 'maryannefurey@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'adb584@mun.ca', 'Ashley', 'Dawn Best', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'adb584@mun.ca' OR lower(alt_email) = 'adb584@mun.ca'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'anitajones23@btinternet.com', 'Anita', 'Jones', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'anitajones23@btinternet.com' OR lower(alt_email) = 'anitajones23@btinternet.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'bloss.s@icloud.com', 'Bloss', 'Spink', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'bloss.s@icloud.com' OR lower(alt_email) = 'bloss.s@icloud.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'bpatriciauk@yahoo.com', 'Patricia', 'Brune', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'bpatriciauk@yahoo.com' OR lower(alt_email) = 'bpatriciauk@yahoo.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'carina.l.hummel@gmail.com', 'Carina', 'Hummel', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'carina.l.hummel@gmail.com' OR lower(alt_email) = 'carina.l.hummel@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'clairemc15@gmail.com', 'Claire', 'McLellan', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'clairemc15@gmail.com' OR lower(alt_email) = 'clairemc15@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'contactingmichellewatson@gmail.com', 'Michelle', 'Watson', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'contactingmichellewatson@gmail.com' OR lower(alt_email) = 'contactingmichellewatson@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'ljwebb2001@gmail.com', 'Linford', 'Webb', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'ljwebb2001@gmail.com' OR lower(alt_email) = 'ljwebb2001@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'sam_yuide@hotmail.com', 'Sam', 'Yuide', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'sam_yuide@hotmail.com' OR lower(alt_email) = 'sam_yuide@hotmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'valentina.ruggiu@gmail.com', 'Valentina', 'Ruggiu', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'valentina.ruggiu@gmail.com' OR lower(alt_email) = 'valentina.ruggiu@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'victoriajaneharvey@gmail.com', 'Victoria', 'Harvey', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'victoriajaneharvey@gmail.com' OR lower(alt_email) = 'victoriajaneharvey@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'anulekduz@gmail.com', 'Anna', 'Cocker', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'anulekduz@gmail.com' OR lower(alt_email) = 'anulekduz@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'faye.hannah@gmail.com', 'Hannah', 'Tubb', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'faye.hannah@gmail.com' OR lower(alt_email) = 'faye.hannah@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'francescamoresi@hotmail.it', 'Francesca', 'Moresi', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'francescamoresi@hotmail.it' OR lower(alt_email) = 'francescamoresi@hotmail.it'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'hello@pamelamoss.co.uk', 'Pamela', 'Wilson', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'hello@pamelamoss.co.uk' OR lower(alt_email) = 'hello@pamelamoss.co.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'janewoolley@yogamovedance.com', 'Jane', 'Woolley', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'janewoolley@yogamovedance.com' OR lower(alt_email) = 'janewoolley@yogamovedance.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'rebekahpoole.91@gmail.com', 'Rebekah', 'Poole', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'rebekahpoole.91@gmail.com' OR lower(alt_email) = 'rebekahpoole.91@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'sfitzroy51@gmail.com', 'Sarah', 'Fitzroy', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'sfitzroy51@gmail.com' OR lower(alt_email) = 'sfitzroy51@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'annsgarcia@hotmail.com', 'Ann', 'Sanchez Garcia', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'annsgarcia@hotmail.com' OR lower(alt_email) = 'annsgarcia@hotmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'cate.fish60@gmail.com', 'Cate', 'Fish', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'cate.fish60@gmail.com' OR lower(alt_email) = 'cate.fish60@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'curnocka@gmail.com', 'Anna', 'Curnock', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'curnocka@gmail.com' OR lower(alt_email) = 'curnocka@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'gemmalake11@gmail.com', 'Gemma', 'Lake', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'gemmalake11@gmail.com' OR lower(alt_email) = 'gemmalake11@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'georgina0661@btinternet.com', 'Georgina', 'Butcher', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'georgina0661@btinternet.com' OR lower(alt_email) = 'georgina0661@btinternet.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'hello@kerryhipkiss.com', 'Kerry', 'Hipkiss', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'hello@kerryhipkiss.com' OR lower(alt_email) = 'hello@kerryhipkiss.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'hsboby@hotmail.com', 'Helen', 'Boby', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'hsboby@hotmail.com' OR lower(alt_email) = 'hsboby@hotmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'kathy@happiestwhenoutdoors.com', 'Kathy', 'Marston', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'kathy@happiestwhenoutdoors.com' OR lower(alt_email) = 'kathy@happiestwhenoutdoors.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'uceleyoga@gmail.com', 'Victoria', 'Ucele', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'uceleyoga@gmail.com' OR lower(alt_email) = 'uceleyoga@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'tamara@gabbay.com', 'Tamara', 'Gabbay', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'tamara@gabbay.com' OR lower(alt_email) = 'tamara@gabbay.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'jana.stejskalova@outlook.com', 'Jana', 'Stejskalova', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'jana.stejskalova@outlook.com' OR lower(alt_email) = 'jana.stejskalova@outlook.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'koller.inga@gmail.com', 'Inga', 'Koller', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'koller.inga@gmail.com' OR lower(alt_email) = 'koller.inga@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'denihazel@outlook.com', 'Denise', 'Hazel', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'denihazel@outlook.com' OR lower(alt_email) = 'denihazel@outlook.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'libby.nellany1@gmail.com', 'Libby', 'Nellany', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'libby.nellany1@gmail.com' OR lower(alt_email) = 'libby.nellany1@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'daniela.matei@rocketmail.com', 'Daniela', 'Matei', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'daniela.matei@rocketmail.com' OR lower(alt_email) = 'daniela.matei@rocketmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'ellertonchristina@gmail.com', 'Christina', 'Ellerton', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'ellertonchristina@gmail.com' OR lower(alt_email) = 'ellertonchristina@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'carolesimmons1@icloud.com', 'Carole', 'Simmons', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'carolesimmons1@icloud.com' OR lower(alt_email) = 'carolesimmons1@icloud.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'eastsussexeft@gmail.com', 'Ilaria', 'Longo', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'eastsussexeft@gmail.com' OR lower(alt_email) = 'eastsussexeft@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'farahwinning@gmail.com', 'Farah', 'Winning', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'farahwinning@gmail.com' OR lower(alt_email) = 'farahwinning@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'harveydraycott@gmail.com', 'Harvey', 'Draycott', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'harveydraycott@gmail.com' OR lower(alt_email) = 'harveydraycott@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'hello@santoshamarketing.co.uk', 'Laura', 'Campbell', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'hello@santoshamarketing.co.uk' OR lower(alt_email) = 'hello@santoshamarketing.co.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'jacquelineafarrant@gmail.com', 'Jacqueline', 'Farrant', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'jacquelineafarrant@gmail.com' OR lower(alt_email) = 'jacquelineafarrant@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'leightay66@gmail.com', 'Leigh', 'Doran', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'leightay66@gmail.com' OR lower(alt_email) = 'leightay66@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'zibasarikhani@gmail.com', 'Ziba', 'Sarikhani', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'zibasarikhani@gmail.com' OR lower(alt_email) = 'zibasarikhani@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'maxshorto@hotmail.com', 'Maxine', 'Shorto', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'maxshorto@hotmail.com' OR lower(alt_email) = 'maxshorto@hotmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'sarah@thewellerway.co.uk', 'Sarah', 'Weller', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'sarah@thewellerway.co.uk' OR lower(alt_email) = 'sarah@thewellerway.co.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'sarahweatherbyyoga@gmail.com', 'Sarah', 'Weatherby', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'sarahweatherbyyoga@gmail.com' OR lower(alt_email) = 'sarahweatherbyyoga@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'sayakalastair@gmail.com', 'Sayaka', 'Beattie', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'sayakalastair@gmail.com' OR lower(alt_email) = 'sayakalastair@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'tom_mcleod89@hotmail.co.uk', 'Tom', 'McLeod', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'tom_mcleod89@hotmail.co.uk' OR lower(alt_email) = 'tom_mcleod89@hotmail.co.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT '2patricejones@gmail.com', 'Patrice', 'Jones', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = '2patricejones@gmail.com' OR lower(alt_email) = '2patricejones@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'alizee.tran@gmail.com', 'AlizÃ©e', 'Tran', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'alizee.tran@gmail.com' OR lower(alt_email) = 'alizee.tran@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'dakshajoshi@icloud.com', 'Daksha', 'Joshi', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'dakshajoshi@icloud.com' OR lower(alt_email) = 'dakshajoshi@icloud.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'elissa.davies64@gmail.com', 'Elissa', 'Davies', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'elissa.davies64@gmail.com' OR lower(alt_email) = 'elissa.davies64@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'evolveyogacumbria@gmail.com', 'Lou', 'Curry', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'evolveyogacumbria@gmail.com' OR lower(alt_email) = 'evolveyogacumbria@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'gostkowskisandra@gmail.com', 'Sandra', 'Gostkowski', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'gostkowskisandra@gmail.com' OR lower(alt_email) = 'gostkowskisandra@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'iyogaimeditate@gmail.com', 'Sandra Maria', 'Rodriguez Ramirez', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'iyogaimeditate@gmail.com' OR lower(alt_email) = 'iyogaimeditate@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'kristinahaladikova@gmail.com', 'Kristina', 'Mujica Buffetti', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'kristinahaladikova@gmail.com' OR lower(alt_email) = 'kristinahaladikova@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'lambert310@googlemail.com', 'Julie', 'Lambert', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'lambert310@googlemail.com' OR lower(alt_email) = 'lambert310@googlemail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'nattymarchant@icloud.com', 'Nat', 'Marchant', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'nattymarchant@icloud.com' OR lower(alt_email) = 'nattymarchant@icloud.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'nika.balomenou@swansea.ac.uk', 'Nika', 'Balomenou', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'nika.balomenou@swansea.ac.uk' OR lower(alt_email) = 'nika.balomenou@swansea.ac.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'nourishyourself@btinternet.com', 'Samantha', 'Feltham', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'nourishyourself@btinternet.com' OR lower(alt_email) = 'nourishyourself@btinternet.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'oguzcanhuner@gmail.com', 'Oguz', 'Huner', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'oguzcanhuner@gmail.com' OR lower(alt_email) = 'oguzcanhuner@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'robmrea@gmail.com', 'Rob', 'Rea', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'robmrea@gmail.com' OR lower(alt_email) = 'robmrea@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'sarah.louise.adams@gmail.com', 'Sarah', 'Peters', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'sarah.louise.adams@gmail.com' OR lower(alt_email) = 'sarah.louise.adams@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'a.breuer-grenz@gmx.net', 'Anna', 'Breuer-Grenz', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'a.breuer-grenz@gmx.net' OR lower(alt_email) = 'a.breuer-grenz@gmx.net'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'layla_hirrell@outlook.com', 'Layla Ashleigh', 'Hirrell', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'layla_hirrell@outlook.com' OR lower(alt_email) = 'layla_hirrell@outlook.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'uripimen@gmail.com', 'Uri', 'Pimentel', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'uripimen@gmail.com' OR lower(alt_email) = 'uripimen@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'rosanna@yogannamae.co.uk', 'Rosanna', 'Meyer', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'rosanna@yogannamae.co.uk' OR lower(alt_email) = 'rosanna@yogannamae.co.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'emmaledwards@btinternet.com', 'Emma', 'Edwards', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'emmaledwards@btinternet.com' OR lower(alt_email) = 'emmaledwards@btinternet.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'jeanette@birchyoga.dk', 'Jeanette', 'Birch Milan', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'jeanette@birchyoga.dk' OR lower(alt_email) = 'jeanette@birchyoga.dk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'mandycourtman@hotmail.co.uk', 'Mandy', 'Pitts', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'mandycourtman@hotmail.co.uk' OR lower(alt_email) = 'mandycourtman@hotmail.co.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'zcharara69@gmail.com', 'Zeina', 'Charara', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'zcharara69@gmail.com' OR lower(alt_email) = 'zcharara69@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'infoherolifestyle@gmail.com', 'Helen', 'Kimber', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'infoherolifestyle@gmail.com' OR lower(alt_email) = 'infoherolifestyle@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'pascale.falempin@gmail.com', 'Pascale', 'Falempin', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'pascale.falempin@gmail.com' OR lower(alt_email) = 'pascale.falempin@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'grahamcaley1980@gmail.com', 'Graham', 'Caley', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'grahamcaley1980@gmail.com' OR lower(alt_email) = 'grahamcaley1980@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'chelsea@chelseagreens.uk', 'Chelsea', 'Greens', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'chelsea@chelseagreens.uk' OR lower(alt_email) = 'chelsea@chelseagreens.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'joyoungyoga@gmail.com', 'Jo', 'Young', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'joyoungyoga@gmail.com' OR lower(alt_email) = 'joyoungyoga@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'maryschnorrenberg@hotmail.com', 'Mary', 'Schnorrenberg', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'maryschnorrenberg@hotmail.com' OR lower(alt_email) = 'maryschnorrenberg@hotmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'papadopouloumia@hotmail.com', 'Maria', 'Papadopoulou', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'papadopouloumia@hotmail.com' OR lower(alt_email) = 'papadopouloumia@hotmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'sarah.wiltshire@aol.co.uk', 'Sarah', 'Wiltshire', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'sarah.wiltshire@aol.co.uk' OR lower(alt_email) = 'sarah.wiltshire@aol.co.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'sarina_03@hotmail.com', 'Sarina', 'Sandhu', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'sarina_03@hotmail.com' OR lower(alt_email) = 'sarina_03@hotmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'victorialeva.london.uk@gmail.com', 'Victoria', 'Leva', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'victorialeva.london.uk@gmail.com' OR lower(alt_email) = 'victorialeva.london.uk@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'tessmabbitt@gmail.com', 'Tess', 'Mabit', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'tessmabbitt@gmail.com' OR lower(alt_email) = 'tessmabbitt@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'amanda_clements@msn.com', 'Amanda', 'Clements', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'amanda_clements@msn.com' OR lower(alt_email) = 'amanda_clements@msn.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'bronwynsilva@gmail.com', 'Bronwyn', 'Silva', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'bronwynsilva@gmail.com' OR lower(alt_email) = 'bronwynsilva@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'dessi.lavery@gmail.com', 'Dessi', 'Lavery', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'dessi.lavery@gmail.com' OR lower(alt_email) = 'dessi.lavery@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'emma_groome@yahoo.co.uk', 'Emma', 'Groome', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'emma_groome@yahoo.co.uk' OR lower(alt_email) = 'emma_groome@yahoo.co.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'esmewren@yahoo.co.uk', 'Esme', 'Wren', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'esmewren@yahoo.co.uk' OR lower(alt_email) = 'esmewren@yahoo.co.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'fidig@yeomanrigg.com', 'Fiona', 'Diggle', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'fidig@yeomanrigg.com' OR lower(alt_email) = 'fidig@yeomanrigg.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'joanna@seekingstillness.co.uk', 'Joanna', 'Fazzani', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'joanna@seekingstillness.co.uk' OR lower(alt_email) = 'joanna@seekingstillness.co.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'lesleycorbet@icloud.com', 'Lesley', 'Corbet', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'lesleycorbet@icloud.com' OR lower(alt_email) = 'lesleycorbet@icloud.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'nagyeva01@yahoo.com', 'Eva', 'Nagy', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'nagyeva01@yahoo.com' OR lower(alt_email) = 'nagyeva01@yahoo.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'pippa@freethespirityoga.co.uk', 'Phillipa', 'Hazeldine', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'pippa@freethespirityoga.co.uk' OR lower(alt_email) = 'pippa@freethespirityoga.co.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'simonelivornese@hotmail.co.uk', 'Simone', 'Livornese', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'simonelivornese@hotmail.co.uk' OR lower(alt_email) = 'simonelivornese@hotmail.co.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'sunitadg@hotmail.com', 'Sunita', 'Devi', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'sunitadg@hotmail.com' OR lower(alt_email) = 'sunitadg@hotmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'aaronsonlucy@gmail.com', 'Lucy', 'Aaronson', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'aaronsonlucy@gmail.com' OR lower(alt_email) = 'aaronsonlucy@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'charlotte.chapman@ymail.com', 'Charlotte', 'Chapman', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'charlotte.chapman@ymail.com' OR lower(alt_email) = 'charlotte.chapman@ymail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'louiseboot@aol.com', 'Louise', 'Thomas', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'louiseboot@aol.com' OR lower(alt_email) = 'louiseboot@aol.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'mattkhudson@gmail.com', 'Matt', 'Hudson', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'mattkhudson@gmail.com' OR lower(alt_email) = 'mattkhudson@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'karolina.manns@gmail.com', 'Karolina', 'Manns', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'karolina.manns@gmail.com' OR lower(alt_email) = 'karolina.manns@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'me@selenecollins.co.uk', 'Selene', 'Collins', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'me@selenecollins.co.uk' OR lower(alt_email) = 'me@selenecollins.co.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'hello@mattmulcahyyoga.com', 'Matt', 'Mulcahy', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'hello@mattmulcahyyoga.com' OR lower(alt_email) = 'hello@mattmulcahyyoga.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'danni.cole14@yahoo.com', 'Danielle', 'Cole', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'danni.cole14@yahoo.com' OR lower(alt_email) = 'danni.cole14@yahoo.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'hello@annadesousa.com', 'Anna', 'de Sousa', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'hello@annadesousa.com' OR lower(alt_email) = 'hello@annadesousa.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'jackie.jjc.yoga@gmail.com', 'Jackie', 'Childs', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'jackie.jjc.yoga@gmail.com' OR lower(alt_email) = 'jackie.jjc.yoga@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'lyndsaykenwright@gmail.com', 'Lyndsay', 'Kenwright', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'lyndsaykenwright@gmail.com' OR lower(alt_email) = 'lyndsaykenwright@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'mail@bartgorissen.com', 'Bart', 'Gorissen', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'mail@bartgorissen.com' OR lower(alt_email) = 'mail@bartgorissen.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'philippatomlinson7@gmail.com', 'Philippa', 'Tomlinson', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'philippatomlinson7@gmail.com' OR lower(alt_email) = 'philippatomlinson7@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'pilateshealth@hotmail.co.uk', 'Lucie', 'Ormerod', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'pilateshealth@hotmail.co.uk' OR lower(alt_email) = 'pilateshealth@hotmail.co.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'fionabates23@virginmedia.com', 'Fiona', 'Bates', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'fionabates23@virginmedia.com' OR lower(alt_email) = 'fionabates23@virginmedia.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'lfbackhouse@gmail.com', 'Lucy', 'Backhouse', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'lfbackhouse@gmail.com' OR lower(alt_email) = 'lfbackhouse@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'chepworth@gmail.com', 'Cathi', 'Hepworth', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'chepworth@gmail.com' OR lower(alt_email) = 'chepworth@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'jody.barber@hutten.co.uk', 'Jody', 'Barber', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'jody.barber@hutten.co.uk' OR lower(alt_email) = 'jody.barber@hutten.co.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'simisandhu_uk@yahoo.co.uk', 'Simi', 'Sandhu', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'simisandhu_uk@yahoo.co.uk' OR lower(alt_email) = 'simisandhu_uk@yahoo.co.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'aarti.shah.aarti@gmail.com', 'Aarti', 'Shah', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'aarti.shah.aarti@gmail.com' OR lower(alt_email) = 'aarti.shah.aarti@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'dharmanatha.porter@gmail.com', 'Dharmanatha', 'Porter', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'dharmanatha.porter@gmail.com' OR lower(alt_email) = 'dharmanatha.porter@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'risa.misu@gmail.com', 'Risa', 'Kawamoto', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'risa.misu@gmail.com' OR lower(alt_email) = 'risa.misu@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'mamaloveyogalondon@gmail.com', 'Sara', 'Smyth', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'mamaloveyogalondon@gmail.com' OR lower(alt_email) = 'mamaloveyogalondon@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'n.redston@proton.me', 'Natalie', 'Redston', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'n.redston@proton.me' OR lower(alt_email) = 'n.redston@proton.me'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'miricalvert@gmail.com', 'Miriam', 'Calvert', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'miricalvert@gmail.com' OR lower(alt_email) = 'miricalvert@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'clairelou_farrell@yahoo.co.uk', 'Claire', 'Farrell', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'clairelou_farrell@yahoo.co.uk' OR lower(alt_email) = 'clairelou_farrell@yahoo.co.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'freddiejenkins12@live.co.uk', 'Frederique', 'Jenkins', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'freddiejenkins12@live.co.uk' OR lower(alt_email) = 'freddiejenkins12@live.co.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'virginiebreton@hotmail.com', 'Virginie', 'Breton', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'virginiebreton@hotmail.com' OR lower(alt_email) = 'virginiebreton@hotmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'natasha.c.obrien@gmail.com', 'Natasha', 'O''Brien', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'natasha.c.obrien@gmail.com' OR lower(alt_email) = 'natasha.c.obrien@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'celestine@vonmoltke.net', 'Celestine', 'von Moltke', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'celestine@vonmoltke.net' OR lower(alt_email) = 'celestine@vonmoltke.net'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'nicola.smith637@gmail.com', 'Nicola', 'Smith', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'nicola.smith637@gmail.com' OR lower(alt_email) = 'nicola.smith637@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'almi.adnane1@gmail.com', 'Lamia', 'Khan', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'almi.adnane1@gmail.com' OR lower(alt_email) = 'almi.adnane1@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'hannah@mayall.net', 'Hannah', 'Mayall', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'hannah@mayall.net' OR lower(alt_email) = 'hannah@mayall.net'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'michele_timmins@hotmail.com', 'Michele', 'Bridgman', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'michele_timmins@hotmail.com' OR lower(alt_email) = 'michele_timmins@hotmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'wildwellnessjunkies@gmail.com', 'Alice', 'Anelli', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'wildwellnessjunkies@gmail.com' OR lower(alt_email) = 'wildwellnessjunkies@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'lcameroo@hotmail.com', 'Leila', 'Bunton', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'lcameroo@hotmail.com' OR lower(alt_email) = 'lcameroo@hotmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'tom@letitbe.co.uk', 'Tom', 'Mcleod', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'tom@letitbe.co.uk' OR lower(alt_email) = 'tom@letitbe.co.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'wafakhamri@hotmail.com', 'Wafa', 'Khamri', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'wafakhamri@hotmail.com' OR lower(alt_email) = 'wafakhamri@hotmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'lucy.a.horton@gmail.com', 'Lucy', 'Macgregor', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'lucy.a.horton@gmail.com' OR lower(alt_email) = 'lucy.a.horton@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'eaglefeather4@mac.com', 'Veronique', 'Mackintosh', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'eaglefeather4@mac.com' OR lower(alt_email) = 'eaglefeather4@mac.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'vivienne.codjoe@gmail.com', 'Vivienne', 'Codjoe', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'vivienne.codjoe@gmail.com' OR lower(alt_email) = 'vivienne.codjoe@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'claire@allwright.me', 'Claire', 'Allwright', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'claire@allwright.me' OR lower(alt_email) = 'claire@allwright.me'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'emilyjane59@icloud.com', 'Emily', 'Holloway', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'emilyjane59@icloud.com' OR lower(alt_email) = 'emilyjane59@icloud.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'tgammonphd@gmail.com', 'Tammy', 'Gammon', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'tgammonphd@gmail.com' OR lower(alt_email) = 'tgammonphd@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'oneconsciousbreath@gmail.com', 'Elizabeth', 'Maitreyi', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'oneconsciousbreath@gmail.com' OR lower(alt_email) = 'oneconsciousbreath@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'keri.stewart1@hotmail.com', 'Keri', 'Stewart', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'keri.stewart1@hotmail.com' OR lower(alt_email) = 'keri.stewart1@hotmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'angiebutterfield50@gmail.com', 'Angie', 'Butterfield', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'angiebutterfield50@gmail.com' OR lower(alt_email) = 'angiebutterfield50@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'sophie.wilkinson1@hotmail.co.uk', 'Sophie', 'Wilkinson', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'sophie.wilkinson1@hotmail.co.uk' OR lower(alt_email) = 'sophie.wilkinson1@hotmail.co.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'leanneclayman@yahoo.com', 'Leanne', 'Clayman', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'leanneclayman@yahoo.com' OR lower(alt_email) = 'leanneclayman@yahoo.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'mariepreaud.photography@gmail.com', 'Marie', 'Preaud Hamann', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'mariepreaud.photography@gmail.com' OR lower(alt_email) = 'mariepreaud.photography@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'dopico.carolina@gmail.com', 'Carolina', 'Dopico Gonzalez', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'dopico.carolina@gmail.com' OR lower(alt_email) = 'dopico.carolina@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'pauladbw@mac.com', 'Paula', 'Bostock', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'pauladbw@mac.com' OR lower(alt_email) = 'pauladbw@mac.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'k.jironet@icloud.com', 'Dr. Karin', 'Jironet', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'k.jironet@icloud.com' OR lower(alt_email) = 'k.jironet@icloud.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'richard_rowlands1@hotmail.com', 'Richard', 'Rowlands', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'richard_rowlands1@hotmail.com' OR lower(alt_email) = 'richard_rowlands1@hotmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'camillacarissaxx@gmail.com', 'Camilla', 'Mccoll', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'camillacarissaxx@gmail.com' OR lower(alt_email) = 'camillacarissaxx@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'willdurkan@gmail.com', 'Will', 'Durkan', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'willdurkan@gmail.com' OR lower(alt_email) = 'willdurkan@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'sardruce@hotmail.com', 'Sarah', 'Druce', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'sardruce@hotmail.com' OR lower(alt_email) = 'sardruce@hotmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'sadiayc@gmail.com', 'Sadia Yasmin', 'Chowdhury', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'sadiayc@gmail.com' OR lower(alt_email) = 'sadiayc@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'danielle_blackie@hotmail.co.uk', 'Danielle', 'Blackie', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'danielle_blackie@hotmail.co.uk' OR lower(alt_email) = 'danielle_blackie@hotmail.co.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'erikalawal@gmail.com', 'Erika', 'Lawal', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'erikalawal@gmail.com' OR lower(alt_email) = 'erikalawal@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'anthonyfalconer23@gmail.com', 'Anthony', 'Falconer', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'anthonyfalconer23@gmail.com' OR lower(alt_email) = 'anthonyfalconer23@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'martin_taylor@me.com', 'Martin', 'Taylor', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'martin_taylor@me.com' OR lower(alt_email) = 'martin_taylor@me.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'elizabethspalding@hotmail.co.uk', 'Elizabeth', 'Spalding', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'elizabethspalding@hotmail.co.uk' OR lower(alt_email) = 'elizabethspalding@hotmail.co.uk'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'willettsue3@gmail.com', 'Sue', 'Willett', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'willettsue3@gmail.com' OR lower(alt_email) = 'willettsue3@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'hershahanda@hotmail.com', 'Hersha', 'Handa', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'hershahanda@hotmail.com' OR lower(alt_email) = 'hershahanda@hotmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'sophieramsay0@gmail.com', 'Sophie', 'Ramsay', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'sophieramsay0@gmail.com' OR lower(alt_email) = 'sophieramsay0@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'lcrompton@talktalk.net', 'Lucy', 'Crompton', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'lcrompton@talktalk.net' OR lower(alt_email) = 'lcrompton@talktalk.net'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'catriona970@gmail.com', 'Catriona', 'Smith', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'catriona970@gmail.com' OR lower(alt_email) = 'catriona970@gmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'asanders100@hotmail.com', 'Amelia', 'Sanders', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'asanders100@hotmail.com' OR lower(alt_email) = 'asanders100@hotmail.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'nandrew@me.com', 'Nicki', 'Andrew', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'nandrew@me.com' OR lower(alt_email) = 'nandrew@me.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'mariepreaud@yahoo.com', 'Marie', 'Preaud Hamann', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'mariepreaud@yahoo.com' OR lower(alt_email) = 'mariepreaud@yahoo.com'
);
INSERT INTO people (email, first_name, last_name, status, assigned_to)
SELECT 'isabellehughes95@gmail.com', 'Isabelle', 'Isla Hamim', 'client', 'Jose'
WHERE NOT EXISTS (
  SELECT 1 FROM people WHERE lower(email) = 'isabellehughes95@gmail.com' OR lower(alt_email) = 'isabellehughes95@gmail.com'
);

-- Step 3: Insert purchases
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 400.00, '2021-01-15', NULL, 'Winter', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'monika.kosmalska@gmail.com' OR lower(p.alt_email) = 'monika.kosmalska@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 570.00, '2021-01-15', NULL, 'Winter', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'alice.dnyr@gmail.com' OR lower(p.alt_email) = 'alice.dnyr@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 570.00, '2021-01-15', NULL, 'Winter', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'heidij7529@gmail.com' OR lower(p.alt_email) = 'heidij7529@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 570.00, '2021-01-15', NULL, 'Winter', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'sarchapman22@gmail.com' OR lower(p.alt_email) = 'sarchapman22@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 600.00, '2021-01-15', NULL, 'Winter', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'emmeline_w@hotmail.com' OR lower(p.alt_email) = 'emmeline_w@hotmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 603.00, '2021-01-15', NULL, 'Winter', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'emilykayeyoga@gmail.com' OR lower(p.alt_email) = 'emilykayeyoga@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 603.00, '2021-01-15', NULL, 'Winter', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'ginali91@hotmail.com' OR lower(p.alt_email) = 'ginali91@hotmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 603.00, '2021-01-15', NULL, 'Winter', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'leelaotremba@hotmail.com' OR lower(p.alt_email) = 'leelaotremba@hotmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 603.00, '2021-01-15', NULL, 'Winter', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'lornafultontherapy@gmail.com' OR lower(p.alt_email) = 'lornafultontherapy@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 603.00, '2021-01-15', NULL, 'Winter', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'lucybyogalondon@gmail.com' OR lower(p.alt_email) = 'lucybyogalondon@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 603.00, '2021-01-15', NULL, 'Winter', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'nadim_ahmeduk@yahoo.co.uk' OR lower(p.alt_email) = 'nadim_ahmeduk@yahoo.co.uk')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 603.00, '2021-01-15', NULL, 'Winter', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'ninalstone213@gmail.com' OR lower(p.alt_email) = 'ninalstone213@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 670.00, '2021-01-15', NULL, 'Winter', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'khouloud.atigue@gmail.com' OR lower(p.alt_email) = 'khouloud.atigue@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 500.00, '2021-10-15', 'Amsterdam', 'Autumn', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'eviechristopher5@gmail.com' OR lower(p.alt_email) = 'eviechristopher5@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 500.00, '2021-10-15', 'Amsterdam', 'Autumn', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'mynameisyvonne@gmail.com' OR lower(p.alt_email) = 'mynameisyvonne@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 500.00, '2021-10-15', 'Amsterdam', 'Autumn', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'nelemartens123@gmail.com' OR lower(p.alt_email) = 'nelemartens123@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 500.00, '2021-10-15', 'Amsterdam', 'Autumn', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'nfawwad@gmail.com' OR lower(p.alt_email) = 'nfawwad@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 500.00, '2021-10-15', 'Amsterdam', 'Autumn', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'p.a.devries0@gmail.com' OR lower(p.alt_email) = 'p.a.devries0@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 500.00, '2021-10-15', 'Amsterdam', 'Autumn', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'sterre-03@hotmail.nl' OR lower(p.alt_email) = 'sterre-03@hotmail.nl')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 500.00, '2021-10-15', 'Amsterdam', 'Autumn', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'sya.hoeke@gmail.com' OR lower(p.alt_email) = 'sya.hoeke@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 550.00, '2021-10-15', 'Amsterdam', 'Autumn', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'giamby78@yahoo.it' OR lower(p.alt_email) = 'giamby78@yahoo.it')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 550.00, '2021-10-15', 'Amsterdam', 'Autumn', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'ionastrebes@gmail.com' OR lower(p.alt_email) = 'ionastrebes@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 550.00, '2021-10-15', 'Amsterdam', 'Autumn', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'jansen.ccm@gmail.com' OR lower(p.alt_email) = 'jansen.ccm@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 550.00, '2021-10-15', 'Amsterdam', 'Autumn', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'jironet@xs4all.nl' OR lower(p.alt_email) = 'jironet@xs4all.nl')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 550.00, '2021-10-15', 'Amsterdam', 'Autumn', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'lagwinnett@gmail.com' OR lower(p.alt_email) = 'lagwinnett@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 550.00, '2021-10-15', 'Amsterdam', 'Autumn', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'mmjf@hotmail.nl' OR lower(p.alt_email) = 'mmjf@hotmail.nl')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 550.00, '2021-10-15', 'Amsterdam', 'Autumn', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'pabagan@gmail.com' OR lower(p.alt_email) = 'pabagan@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 603.00, '2022-10-15', NULL, 'Autumn', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'engelke.michele@gmail.com' OR lower(p.alt_email) = 'engelke.michele@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 603.00, '2022-10-15', NULL, 'Autumn', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'hello@alicebowen.co.uk' OR lower(p.alt_email) = 'hello@alicebowen.co.uk')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 603.00, '2022-10-15', NULL, 'Autumn', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'incircles2022@gmail.com' OR lower(p.alt_email) = 'incircles2022@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 603.00, '2022-10-15', NULL, 'Autumn', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'jessicalouisehaig@outlook.com' OR lower(p.alt_email) = 'jessicalouisehaig@outlook.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 603.00, '2022-10-15', NULL, 'Autumn', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'johnjbrooker@hotmail.com' OR lower(p.alt_email) = 'johnjbrooker@hotmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 603.00, '2022-10-15', NULL, 'Autumn', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'rosie@funkycactusyoga.co.uk' OR lower(p.alt_email) = 'rosie@funkycactusyoga.co.uk')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 603.00, '2022-10-15', NULL, 'Autumn', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'sandrairastorza@yahoo.fr' OR lower(p.alt_email) = 'sandrairastorza@yahoo.fr')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 603.00, '2022-10-15', NULL, 'Autumn', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'sdversi@me.com' OR lower(p.alt_email) = 'sdversi@me.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 603.00, '2022-10-15', NULL, 'Autumn', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'tamara.fadli@gmail.com' OR lower(p.alt_email) = 'tamara.fadli@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 603.00, '2022-10-15', NULL, 'Autumn', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'tanyacruzyoga@gmail.com' OR lower(p.alt_email) = 'tanyacruzyoga@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 605.00, '2022-10-15', NULL, 'Autumn', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'virginiabrix@aol.com' OR lower(p.alt_email) = 'virginiabrix@aol.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 670.00, '2022-10-15', NULL, 'Autumn', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'helyrosewellness@gmail.com' OR lower(p.alt_email) = 'helyrosewellness@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 450.00, '2022-07-15', NULL, 'Summer', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'amyemcdonald01@gmail.com' OR lower(p.alt_email) = 'amyemcdonald01@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 450.00, '2022-07-15', NULL, 'Summer', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'selinanath@gmail.com' OR lower(p.alt_email) = 'selinanath@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 603.00, '2022-07-15', NULL, 'Summer', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'alex.lee.taylor@gmail.com' OR lower(p.alt_email) = 'alex.lee.taylor@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 603.00, '2022-07-15', NULL, 'Summer', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'beverley.day@mac.com' OR lower(p.alt_email) = 'beverley.day@mac.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 603.00, '2022-07-15', NULL, 'Summer', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'dg@marblesdesign.co.uk' OR lower(p.alt_email) = 'dg@marblesdesign.co.uk')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 603.00, '2022-07-15', NULL, 'Summer', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'framechloe@gmail.com' OR lower(p.alt_email) = 'framechloe@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 603.00, '2022-07-15', NULL, 'Summer', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'mariareid63@hotmail.com' OR lower(p.alt_email) = 'mariareid63@hotmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 603.00, '2022-07-15', NULL, 'Summer', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'mgbneves@gmail.com' OR lower(p.alt_email) = 'mgbneves@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 603.00, '2022-07-15', NULL, 'Summer', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'momoiah@yahoo.com' OR lower(p.alt_email) = 'momoiah@yahoo.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 603.00, '2022-07-15', NULL, 'Summer', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'pamela_kaur@yahoo.co.uk' OR lower(p.alt_email) = 'pamela_kaur@yahoo.co.uk')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 603.00, '2022-07-15', NULL, 'Summer', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'richard.luke.benson@gmail.com' OR lower(p.alt_email) = 'richard.luke.benson@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 603.00, '2022-07-15', NULL, 'Summer', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'sammy@sammyrainbowfurnival.com' OR lower(p.alt_email) = 'sammy@sammyrainbowfurnival.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 603.00, '2022-07-15', NULL, 'Summer', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'tan.h.bristow@gmail.com' OR lower(p.alt_email) = 'tan.h.bristow@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 603.00, '2022-07-15', NULL, 'Summer', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'wisewomanhealings@gmail.com' OR lower(p.alt_email) = 'wisewomanhealings@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 670.00, '2022-07-15', NULL, 'Summer', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'kerrie.lambert@outlook.com' OR lower(p.alt_email) = 'kerrie.lambert@outlook.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 670.00, '2022-07-15', NULL, 'Summer', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'millyblewis@gmail.com' OR lower(p.alt_email) = 'millyblewis@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 480.00, '2022-10-15', 'Amsterdam', 'Autumn', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'charlie.eriksen@gmail.com' OR lower(p.alt_email) = 'charlie.eriksen@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 480.00, '2022-10-15', 'Amsterdam', 'Autumn', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'diana_geernaert@hotmail.com' OR lower(p.alt_email) = 'diana_geernaert@hotmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 480.00, '2022-10-15', 'Amsterdam', 'Autumn', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'giangtruong63@gmail.com' OR lower(p.alt_email) = 'giangtruong63@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 480.00, '2022-10-15', 'Amsterdam', 'Autumn', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'guro.broen@gmail.com' OR lower(p.alt_email) = 'guro.broen@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 480.00, '2022-10-15', 'Amsterdam', 'Autumn', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'hanna.harbouli@cygnific.com' OR lower(p.alt_email) = 'hanna.harbouli@cygnific.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 480.00, '2022-10-15', 'Amsterdam', 'Autumn', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'hoferkova.romana@gmail.com' OR lower(p.alt_email) = 'hoferkova.romana@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 480.00, '2022-10-15', 'Amsterdam', 'Autumn', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'irene.lahde@outlook.com' OR lower(p.alt_email) = 'irene.lahde@outlook.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 480.00, '2022-10-15', 'Amsterdam', 'Autumn', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'joyduits@outlook.com' OR lower(p.alt_email) = 'joyduits@outlook.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 480.00, '2022-10-15', 'Amsterdam', 'Autumn', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'shirleykraemer7@gmail.com' OR lower(p.alt_email) = 'shirleykraemer7@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 550.00, '2023-07-15', NULL, 'Summer', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'katherine@katherineinge.com' OR lower(p.alt_email) = 'katherine@katherineinge.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 690.00, '2023-07-15', NULL, 'Summer', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'huebnerlindsey@gmail.com' OR lower(p.alt_email) = 'huebnerlindsey@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 690.00, '2023-07-15', NULL, 'Summer', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'issyluckyoga@gmail.com' OR lower(p.alt_email) = 'issyluckyoga@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 690.00, '2023-07-15', NULL, 'Summer', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'midlifefb@hotmail.com' OR lower(p.alt_email) = 'midlifefb@hotmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 690.00, '2023-07-15', NULL, 'Summer', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'pascalebarget@googlemail.com' OR lower(p.alt_email) = 'pascalebarget@googlemail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 690.00, '2023-07-15', NULL, 'Summer', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'sushilla@sushilla.co.uk' OR lower(p.alt_email) = 'sushilla@sushilla.co.uk')
  AND pr.name = 'Breathwork Professional Training - 60hr (Live)';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2021-04-15', 'Paid to Nigel', 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'newmancom247@gmail.com' OR lower(p.alt_email) = 'newmancom247@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'mcclintockemma@gmail.com' OR lower(p.alt_email) = 'mcclintockemma@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 280.00, '2021-04-15', 'Scholarship', 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'agni_malaika@yahoo.com' OR lower(p.alt_email) = 'agni_malaika@yahoo.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 280.00, '2021-04-15', 'Scholarship', 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'akalaurent@mac.com' OR lower(p.alt_email) = 'akalaurent@mac.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 500.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'asya.oflaherty@yahoo.co.uk' OR lower(p.alt_email) = 'asya.oflaherty@yahoo.co.uk')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 500.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'veronika.quintyne@yahoo.co.uk' OR lower(p.alt_email) = 'veronika.quintyne@yahoo.co.uk')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 515.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'amani_eke@yahoo.co.uk' OR lower(p.alt_email) = 'amani_eke@yahoo.co.uk')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 515.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'bart@3cats.uk' OR lower(p.alt_email) = 'bart@3cats.uk')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 515.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'e.a.channing@me.com' OR lower(p.alt_email) = 'e.a.channing@me.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 515.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'ellewalsh@hotmail.com' OR lower(p.alt_email) = 'ellewalsh@hotmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 515.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'emmagoldschmidt85@gmail.com' OR lower(p.alt_email) = 'emmagoldschmidt85@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 515.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'estherpettinger@gmail.com' OR lower(p.alt_email) = 'estherpettinger@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 515.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'helenannem879@yahoo.co.uk' OR lower(p.alt_email) = 'helenannem879@yahoo.co.uk')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 515.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'helenrussellclark@hotmail.com' OR lower(p.alt_email) = 'helenrussellclark@hotmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 515.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'info@katehughesmeditation.co.uk' OR lower(p.alt_email) = 'info@katehughesmeditation.co.uk')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 515.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'maracimatorib@gmail.com' OR lower(p.alt_email) = 'maracimatorib@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 515.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'nicola@nicolapott.co.uk' OR lower(p.alt_email) = 'nicola@nicolapott.co.uk')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 515.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'nikkiessential@hotmail.com' OR lower(p.alt_email) = 'nikkiessential@hotmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 515.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'stephcowton@gmail.com' OR lower(p.alt_email) = 'stephcowton@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 515.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'yogawithdianasaline@gmail.com' OR lower(p.alt_email) = 'yogawithdianasaline@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 550.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'fra.giustetti@gmail.com' OR lower(p.alt_email) = 'fra.giustetti@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 565.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'abirmuhtasib@hotmail.com' OR lower(p.alt_email) = 'abirmuhtasib@hotmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 565.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'hart_k@hotmail.com' OR lower(p.alt_email) = 'hart_k@hotmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 565.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'julietclark@tiscali.co.uk' OR lower(p.alt_email) = 'julietclark@tiscali.co.uk')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 565.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'lornacw11@gmail.com' OR lower(p.alt_email) = 'lornacw11@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 565.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'mollietolino@outlook.com' OR lower(p.alt_email) = 'mollietolino@outlook.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 280.00, '2021-07-15', NULL, 'Summer', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'amy.hale2020@gmail.com' OR lower(p.alt_email) = 'amy.hale2020@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 285.00, '2021-07-15', NULL, 'Summer', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'maireadteresalucy@gmail.com' OR lower(p.alt_email) = 'maireadteresalucy@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 285.00, '2021-07-15', NULL, 'Summer', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'nourished_soul_yoga@hotmail.com' OR lower(p.alt_email) = 'nourished_soul_yoga@hotmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 285.00, '2021-07-15', NULL, 'Summer', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'pat@theintelligentbody.co.uk' OR lower(p.alt_email) = 'pat@theintelligentbody.co.uk')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 515.00, '2021-07-15', NULL, 'Summer', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'helenannem879@yahoo.co.uk' OR lower(p.alt_email) = 'helenannem879@yahoo.co.uk')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 515.00, '2021-07-15', NULL, 'Summer', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'maryannefurey@gmail.com' OR lower(p.alt_email) = 'maryannefurey@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 520.00, '2021-07-15', NULL, 'Summer', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'adb584@mun.ca' OR lower(p.alt_email) = 'adb584@mun.ca')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 520.00, '2021-07-15', NULL, 'Summer', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'anitajones23@btinternet.com' OR lower(p.alt_email) = 'anitajones23@btinternet.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 520.00, '2021-07-15', NULL, 'Summer', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'bloss.s@icloud.com' OR lower(p.alt_email) = 'bloss.s@icloud.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 520.00, '2021-07-15', NULL, 'Summer', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'bpatriciauk@yahoo.com' OR lower(p.alt_email) = 'bpatriciauk@yahoo.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 520.00, '2021-07-15', NULL, 'Summer', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'carina.l.hummel@gmail.com' OR lower(p.alt_email) = 'carina.l.hummel@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 520.00, '2021-07-15', NULL, 'Summer', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'clairemc15@gmail.com' OR lower(p.alt_email) = 'clairemc15@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 520.00, '2021-07-15', NULL, 'Summer', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'contactingmichellewatson@gmail.com' OR lower(p.alt_email) = 'contactingmichellewatson@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 520.00, '2021-07-15', NULL, 'Summer', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'katherine@katherineinge.com' OR lower(p.alt_email) = 'katherine@katherineinge.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 520.00, '2021-07-15', NULL, 'Summer', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'ljwebb2001@gmail.com' OR lower(p.alt_email) = 'ljwebb2001@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 520.00, '2021-07-15', NULL, 'Summer', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'sam_yuide@hotmail.com' OR lower(p.alt_email) = 'sam_yuide@hotmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 520.00, '2021-07-15', NULL, 'Summer', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'valentina.ruggiu@gmail.com' OR lower(p.alt_email) = 'valentina.ruggiu@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 520.00, '2021-07-15', NULL, 'Summer', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'victoriajaneharvey@gmail.com' OR lower(p.alt_email) = 'victoriajaneharvey@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 570.00, '2021-07-15', NULL, 'Summer', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'anulekduz@gmail.com' OR lower(p.alt_email) = 'anulekduz@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 570.00, '2021-07-15', NULL, 'Summer', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'faye.hannah@gmail.com' OR lower(p.alt_email) = 'faye.hannah@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 570.00, '2021-07-15', NULL, 'Summer', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'francescamoresi@hotmail.it' OR lower(p.alt_email) = 'francescamoresi@hotmail.it')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 570.00, '2021-07-15', NULL, 'Summer', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'hello@pamelamoss.co.uk' OR lower(p.alt_email) = 'hello@pamelamoss.co.uk')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 570.00, '2021-07-15', NULL, 'Summer', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'janewoolley@yogamovedance.com' OR lower(p.alt_email) = 'janewoolley@yogamovedance.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 570.00, '2021-07-15', NULL, 'Summer', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'rebekahpoole.91@gmail.com' OR lower(p.alt_email) = 'rebekahpoole.91@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 570.00, '2021-07-15', NULL, 'Summer', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'sfitzroy51@gmail.com' OR lower(p.alt_email) = 'sfitzroy51@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 480.00, '2021-10-15', 'Amsterdam', 'Autumn', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'giamby78@yahoo.it' OR lower(p.alt_email) = 'giamby78@yahoo.it')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 480.00, '2021-10-15', 'Amsterdam', 'Autumn', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'jansen.ccm@gmail.com' OR lower(p.alt_email) = 'jansen.ccm@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 350.00, '2022-04-15', NULL, 'Spring', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'annsgarcia@hotmail.com' OR lower(p.alt_email) = 'annsgarcia@hotmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 400.00, '2022-04-15', NULL, 'Spring', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'monika.kosmalska@gmail.com' OR lower(p.alt_email) = 'monika.kosmalska@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 520.00, '2022-04-15', NULL, 'Spring', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'clairemc15@gmail.com' OR lower(p.alt_email) = 'clairemc15@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 539.00, '2022-04-15', NULL, 'Spring', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'cate.fish60@gmail.com' OR lower(p.alt_email) = 'cate.fish60@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 539.00, '2022-04-15', NULL, 'Spring', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'curnocka@gmail.com' OR lower(p.alt_email) = 'curnocka@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 539.00, '2022-04-15', NULL, 'Spring', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'gemmalake11@gmail.com' OR lower(p.alt_email) = 'gemmalake11@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 539.00, '2022-04-15', NULL, 'Spring', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'georgina0661@btinternet.com' OR lower(p.alt_email) = 'georgina0661@btinternet.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 539.00, '2022-04-15', NULL, 'Spring', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'hello@kerryhipkiss.com' OR lower(p.alt_email) = 'hello@kerryhipkiss.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 539.00, '2022-04-15', NULL, 'Spring', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'hsboby@hotmail.com' OR lower(p.alt_email) = 'hsboby@hotmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 539.00, '2022-04-15', NULL, 'Spring', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'kathy@happiestwhenoutdoors.com' OR lower(p.alt_email) = 'kathy@happiestwhenoutdoors.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 539.00, '2022-04-15', NULL, 'Spring', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'uceleyoga@gmail.com' OR lower(p.alt_email) = 'uceleyoga@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 539.00, '2022-04-15', NULL, 'Spring', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'tamara@gabbay.com' OR lower(p.alt_email) = 'tamara@gabbay.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 599.00, '2022-04-15', NULL, 'Spring', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'jana.stejskalova@outlook.com' OR lower(p.alt_email) = 'jana.stejskalova@outlook.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 599.00, '2022-04-15', NULL, 'Spring', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'koller.inga@gmail.com' OR lower(p.alt_email) = 'koller.inga@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 600.00, '2022-04-15', NULL, 'Spring', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'emmeline_w@hotmail.com' OR lower(p.alt_email) = 'emmeline_w@hotmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 603.00, '2022-04-15', NULL, 'Spring', 2022
FROM people p, products pr
WHERE (lower(p.email) = 'ninalstone213@gmail.com' OR lower(p.alt_email) = 'ninalstone213@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2023-10-15', 'Scholarship', 'Autumn', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'denihazel@outlook.com' OR lower(p.alt_email) = 'denihazel@outlook.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2023-10-15', 'Refunded', 'Autumn', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'libby.nellany1@gmail.com' OR lower(p.alt_email) = 'libby.nellany1@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 588.00, '2023-10-15', NULL, 'Autumn', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'daniela.matei@rocketmail.com' OR lower(p.alt_email) = 'daniela.matei@rocketmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 590.00, '2023-10-15', NULL, 'Autumn', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'ellertonchristina@gmail.com' OR lower(p.alt_email) = 'ellertonchristina@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 621.00, '2023-10-15', NULL, 'Autumn', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'carolesimmons1@icloud.com' OR lower(p.alt_email) = 'carolesimmons1@icloud.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 621.00, '2023-10-15', NULL, 'Autumn', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'eastsussexeft@gmail.com' OR lower(p.alt_email) = 'eastsussexeft@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 621.00, '2023-10-15', NULL, 'Autumn', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'farahwinning@gmail.com' OR lower(p.alt_email) = 'farahwinning@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 621.00, '2023-10-15', NULL, 'Autumn', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'harveydraycott@gmail.com' OR lower(p.alt_email) = 'harveydraycott@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 621.00, '2023-10-15', NULL, 'Autumn', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'hello@santoshamarketing.co.uk' OR lower(p.alt_email) = 'hello@santoshamarketing.co.uk')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 621.00, '2023-10-15', NULL, 'Autumn', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'jacquelineafarrant@gmail.com' OR lower(p.alt_email) = 'jacquelineafarrant@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 621.00, '2023-10-15', NULL, 'Autumn', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'leightay66@gmail.com' OR lower(p.alt_email) = 'leightay66@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 621.00, '2023-10-15', NULL, 'Autumn', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'zibasarikhani@gmail.com' OR lower(p.alt_email) = 'zibasarikhani@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 690.00, '2023-10-15', NULL, 'Autumn', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'maxshorto@hotmail.com' OR lower(p.alt_email) = 'maxshorto@hotmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 690.00, '2023-10-15', NULL, 'Autumn', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'sarah@thewellerway.co.uk' OR lower(p.alt_email) = 'sarah@thewellerway.co.uk')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 690.00, '2023-10-15', NULL, 'Autumn', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'sarahweatherbyyoga@gmail.com' OR lower(p.alt_email) = 'sarahweatherbyyoga@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 690.00, '2023-10-15', NULL, 'Autumn', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'sayakalastair@gmail.com' OR lower(p.alt_email) = 'sayakalastair@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 690.00, '2023-10-15', NULL, 'Autumn', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'tom_mcleod89@hotmail.co.uk' OR lower(p.alt_email) = 'tom_mcleod89@hotmail.co.uk')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2023-04-15', 'Refunded', 'Spring', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'jessicalouisehaig@outlook.com' OR lower(p.alt_email) = 'jessicalouisehaig@outlook.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 585.00, '2023-04-15', NULL, 'Spring', 2023
FROM people p, products pr
WHERE (lower(p.email) = '2patricejones@gmail.com' OR lower(p.alt_email) = '2patricejones@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 585.00, '2023-04-15', NULL, 'Spring', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'alizee.tran@gmail.com' OR lower(p.alt_email) = 'alizee.tran@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 585.00, '2023-04-15', NULL, 'Spring', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'dakshajoshi@icloud.com' OR lower(p.alt_email) = 'dakshajoshi@icloud.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 585.00, '2023-04-15', NULL, 'Spring', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'elissa.davies64@gmail.com' OR lower(p.alt_email) = 'elissa.davies64@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 585.00, '2023-04-15', NULL, 'Spring', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'evolveyogacumbria@gmail.com' OR lower(p.alt_email) = 'evolveyogacumbria@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 585.00, '2023-04-15', NULL, 'Spring', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'gostkowskisandra@gmail.com' OR lower(p.alt_email) = 'gostkowskisandra@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 585.00, '2023-04-15', NULL, 'Spring', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'iyogaimeditate@gmail.com' OR lower(p.alt_email) = 'iyogaimeditate@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 585.00, '2023-04-15', NULL, 'Spring', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'kristinahaladikova@gmail.com' OR lower(p.alt_email) = 'kristinahaladikova@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 585.00, '2023-04-15', NULL, 'Spring', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'lambert310@googlemail.com' OR lower(p.alt_email) = 'lambert310@googlemail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 585.00, '2023-04-15', NULL, 'Spring', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'nattymarchant@icloud.com' OR lower(p.alt_email) = 'nattymarchant@icloud.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 585.00, '2023-04-15', NULL, 'Spring', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'nika.balomenou@swansea.ac.uk' OR lower(p.alt_email) = 'nika.balomenou@swansea.ac.uk')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 585.00, '2023-04-15', NULL, 'Spring', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'nourishyourself@btinternet.com' OR lower(p.alt_email) = 'nourishyourself@btinternet.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 585.00, '2023-04-15', NULL, 'Spring', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'oguzcanhuner@gmail.com' OR lower(p.alt_email) = 'oguzcanhuner@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 585.00, '2023-04-15', NULL, 'Spring', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'robmrea@gmail.com' OR lower(p.alt_email) = 'robmrea@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 585.00, '2023-04-15', NULL, 'Spring', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'sarah.louise.adams@gmail.com' OR lower(p.alt_email) = 'sarah.louise.adams@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 650.00, '2023-04-15', NULL, 'Spring', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'a.breuer-grenz@gmx.net' OR lower(p.alt_email) = 'a.breuer-grenz@gmx.net')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 400.00, '2024-04-15', NULL, 'Spring', 2024
FROM people p, products pr
WHERE (lower(p.email) = 'layla_hirrell@outlook.com' OR lower(p.alt_email) = 'layla_hirrell@outlook.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 400.00, '2024-04-15', NULL, 'Spring', 2024
FROM people p, products pr
WHERE (lower(p.email) = 'uripimen@gmail.com' OR lower(p.alt_email) = 'uripimen@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 570.00, '2024-04-15', NULL, 'Spring', 2024
FROM people p, products pr
WHERE (lower(p.email) = 'rosanna@yogannamae.co.uk' OR lower(p.alt_email) = 'rosanna@yogannamae.co.uk')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 590.00, '2024-04-15', NULL, 'Spring', 2024
FROM people p, products pr
WHERE (lower(p.email) = 'emmaledwards@btinternet.com' OR lower(p.alt_email) = 'emmaledwards@btinternet.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 645.00, '2024-04-15', NULL, 'Spring', 2024
FROM people p, products pr
WHERE (lower(p.email) = 'jeanette@birchyoga.dk' OR lower(p.alt_email) = 'jeanette@birchyoga.dk')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 645.00, '2024-04-15', NULL, 'Spring', 2024
FROM people p, products pr
WHERE (lower(p.email) = 'mandycourtman@hotmail.co.uk' OR lower(p.alt_email) = 'mandycourtman@hotmail.co.uk')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 645.00, '2024-04-15', NULL, 'Spring', 2024
FROM people p, products pr
WHERE (lower(p.email) = 'zcharara69@gmail.com' OR lower(p.alt_email) = 'zcharara69@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 720.00, '2024-04-15', NULL, 'Spring', 2024
FROM people p, products pr
WHERE (lower(p.email) = 'infoherolifestyle@gmail.com' OR lower(p.alt_email) = 'infoherolifestyle@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 720.00, '2024-04-15', NULL, 'Spring', 2024
FROM people p, products pr
WHERE (lower(p.email) = 'pascale.falempin@gmail.com' OR lower(p.alt_email) = 'pascale.falempin@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2021-10-15', 'Refunded', 'Autumn', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'grahamcaley1980@gmail.com' OR lower(p.alt_email) = 'grahamcaley1980@gmail.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 570.00, '2021-10-15', NULL, 'Autumn', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'heidij7529@gmail.com' OR lower(p.alt_email) = 'heidij7529@gmail.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 600.00, '2021-10-15', NULL, 'Autumn', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'emmeline_w@hotmail.com' OR lower(p.alt_email) = 'emmeline_w@hotmail.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 603.00, '2021-10-15', NULL, 'Autumn', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'chelsea@chelseagreens.uk' OR lower(p.alt_email) = 'chelsea@chelseagreens.uk')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 603.00, '2021-10-15', NULL, 'Autumn', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'joyoungyoga@gmail.com' OR lower(p.alt_email) = 'joyoungyoga@gmail.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 603.00, '2021-10-15', NULL, 'Autumn', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'maryschnorrenberg@hotmail.com' OR lower(p.alt_email) = 'maryschnorrenberg@hotmail.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 603.00, '2021-10-15', NULL, 'Autumn', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'papadopouloumia@hotmail.com' OR lower(p.alt_email) = 'papadopouloumia@hotmail.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 603.00, '2021-10-15', NULL, 'Autumn', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'sarah.wiltshire@aol.co.uk' OR lower(p.alt_email) = 'sarah.wiltshire@aol.co.uk')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 603.00, '2021-10-15', NULL, 'Autumn', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'sarina_03@hotmail.com' OR lower(p.alt_email) = 'sarina_03@hotmail.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 603.00, '2021-10-15', NULL, 'Autumn', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'victorialeva.london.uk@gmail.com' OR lower(p.alt_email) = 'victorialeva.london.uk@gmail.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 295.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'grahamcaley1980@gmail.com' OR lower(p.alt_email) = 'grahamcaley1980@gmail.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 295.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'tessmabbitt@gmail.com' OR lower(p.alt_email) = 'tessmabbitt@gmail.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 540.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'amanda_clements@msn.com' OR lower(p.alt_email) = 'amanda_clements@msn.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 540.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'bronwynsilva@gmail.com' OR lower(p.alt_email) = 'bronwynsilva@gmail.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 540.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'dessi.lavery@gmail.com' OR lower(p.alt_email) = 'dessi.lavery@gmail.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 540.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'emma_groome@yahoo.co.uk' OR lower(p.alt_email) = 'emma_groome@yahoo.co.uk')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 540.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'esmewren@yahoo.co.uk' OR lower(p.alt_email) = 'esmewren@yahoo.co.uk')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 540.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'fidig@yeomanrigg.com' OR lower(p.alt_email) = 'fidig@yeomanrigg.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 540.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'joanna@seekingstillness.co.uk' OR lower(p.alt_email) = 'joanna@seekingstillness.co.uk')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 540.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'lesleycorbet@icloud.com' OR lower(p.alt_email) = 'lesleycorbet@icloud.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 540.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'nagyeva01@yahoo.com' OR lower(p.alt_email) = 'nagyeva01@yahoo.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 540.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'pippa@freethespirityoga.co.uk' OR lower(p.alt_email) = 'pippa@freethespirityoga.co.uk')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 540.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'sfitzroy51@gmail.com' OR lower(p.alt_email) = 'sfitzroy51@gmail.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 540.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'simonelivornese@hotmail.co.uk' OR lower(p.alt_email) = 'simonelivornese@hotmail.co.uk')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 540.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'sunitadg@hotmail.com' OR lower(p.alt_email) = 'sunitadg@hotmail.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 590.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'aaronsonlucy@gmail.com' OR lower(p.alt_email) = 'aaronsonlucy@gmail.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 590.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'charlotte.chapman@ymail.com' OR lower(p.alt_email) = 'charlotte.chapman@ymail.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 590.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'kathy@happiestwhenoutdoors.com' OR lower(p.alt_email) = 'kathy@happiestwhenoutdoors.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 590.00, '2021-04-15', NULL, 'Spring', 2021
FROM people p, products pr
WHERE (lower(p.email) = 'louiseboot@aol.com' OR lower(p.alt_email) = 'louiseboot@aol.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 640.00, '2020-01-15', NULL, 'Winter', 2020
FROM people p, products pr
WHERE (lower(p.email) = 'mattkhudson@gmail.com' OR lower(p.alt_email) = 'mattkhudson@gmail.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 640.00, '2020-01-15', NULL, 'Winter', 2020
FROM people p, products pr
WHERE (lower(p.email) = 'karolina.manns@gmail.com' OR lower(p.alt_email) = 'karolina.manns@gmail.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 640.00, '2020-01-15', NULL, 'Winter', 2020
FROM people p, products pr
WHERE (lower(p.email) = 'me@selenecollins.co.uk' OR lower(p.alt_email) = 'me@selenecollins.co.uk')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 640.00, '2020-01-15', NULL, 'Winter', 2020
FROM people p, products pr
WHERE (lower(p.email) = 'hello@mattmulcahyyoga.com' OR lower(p.alt_email) = 'hello@mattmulcahyyoga.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 640.00, '2020-01-15', NULL, 'Winter', 2020
FROM people p, products pr
WHERE (lower(p.email) = 'danni.cole14@yahoo.com' OR lower(p.alt_email) = 'danni.cole14@yahoo.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 640.00, '2020-01-15', NULL, 'Winter', 2020
FROM people p, products pr
WHERE (lower(p.email) = 'nagyeva01@yahoo.com' OR lower(p.alt_email) = 'nagyeva01@yahoo.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2023-04-15', 'Refunded', 'Spring', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'sandrairastorza@yahoo.fr' OR lower(p.alt_email) = 'sandrairastorza@yahoo.fr')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 450.00, '2023-01-15', NULL, 'Winter', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'selinanath@gmail.com' OR lower(p.alt_email) = 'selinanath@gmail.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 531.00, '2023-01-15', NULL, 'Winter', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'hello@annadesousa.com' OR lower(p.alt_email) = 'hello@annadesousa.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 531.00, '2023-01-15', NULL, 'Winter', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'jackie.jjc.yoga@gmail.com' OR lower(p.alt_email) = 'jackie.jjc.yoga@gmail.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 531.00, '2023-01-15', NULL, 'Winter', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'lyndsaykenwright@gmail.com' OR lower(p.alt_email) = 'lyndsaykenwright@gmail.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 531.00, '2023-01-15', NULL, 'Winter', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'mail@bartgorissen.com' OR lower(p.alt_email) = 'mail@bartgorissen.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 531.00, '2023-01-15', NULL, 'Winter', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'philippatomlinson7@gmail.com' OR lower(p.alt_email) = 'philippatomlinson7@gmail.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 531.00, '2023-01-15', NULL, 'Winter', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'pilateshealth@hotmail.co.uk' OR lower(p.alt_email) = 'pilateshealth@hotmail.co.uk')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 585.00, '2023-01-15', NULL, 'Winter', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'fionabates23@virginmedia.com' OR lower(p.alt_email) = 'fionabates23@virginmedia.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 590.00, '2023-01-15', NULL, 'Winter', 2023
FROM people p, products pr
WHERE (lower(p.email) = 'lfbackhouse@gmail.com' OR lower(p.alt_email) = 'lfbackhouse@gmail.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 400.00, '2024-10-15', NULL, 'Autumn', 2024
FROM people p, products pr
WHERE (lower(p.email) = 'layla_hirrell@outlook.com' OR lower(p.alt_email) = 'layla_hirrell@outlook.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 585.00, '2024-10-15', NULL, 'Autumn', 2024
FROM people p, products pr
WHERE (lower(p.email) = 'chepworth@gmail.com' OR lower(p.alt_email) = 'chepworth@gmail.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 590.00, '2024-10-15', NULL, 'Autumn', 2024
FROM people p, products pr
WHERE (lower(p.email) = 'infoherolifestyle@gmail.com' OR lower(p.alt_email) = 'infoherolifestyle@gmail.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 590.00, '2024-10-15', NULL, 'Autumn', 2024
FROM people p, products pr
WHERE (lower(p.email) = 'jody.barber@hutten.co.uk' OR lower(p.alt_email) = 'jody.barber@hutten.co.uk')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 590.00, '2024-10-15', NULL, 'Autumn', 2024
FROM people p, products pr
WHERE (lower(p.email) = 'sushilla@sushilla.co.uk' OR lower(p.alt_email) = 'sushilla@sushilla.co.uk')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 500.00, '2024-01-15', NULL, 'Winter', 2024
FROM people p, products pr
WHERE (lower(p.email) = 'daniela.matei@rocketmail.com' OR lower(p.alt_email) = 'daniela.matei@rocketmail.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 500.00, '2024-01-15', NULL, 'Winter', 2024
FROM people p, products pr
WHERE (lower(p.email) = 'simisandhu_uk@yahoo.co.uk' OR lower(p.alt_email) = 'simisandhu_uk@yahoo.co.uk')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 531.00, '2024-01-15', NULL, 'Winter', 2024
FROM people p, products pr
WHERE (lower(p.email) = 'aarti.shah.aarti@gmail.com' OR lower(p.alt_email) = 'aarti.shah.aarti@gmail.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 531.00, '2024-01-15', NULL, 'Winter', 2024
FROM people p, products pr
WHERE (lower(p.email) = 'dharmanatha.porter@gmail.com' OR lower(p.alt_email) = 'dharmanatha.porter@gmail.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 531.00, '2024-01-15', NULL, 'Winter', 2024
FROM people p, products pr
WHERE (lower(p.email) = 'ljwebb2001@gmail.com' OR lower(p.alt_email) = 'ljwebb2001@gmail.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 531.00, '2024-01-15', NULL, 'Winter', 2024
FROM people p, products pr
WHERE (lower(p.email) = 'richard.luke.benson@gmail.com' OR lower(p.alt_email) = 'richard.luke.benson@gmail.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 531.00, '2024-01-15', NULL, 'Winter', 2024
FROM people p, products pr
WHERE (lower(p.email) = 'tanyacruzyoga@gmail.com' OR lower(p.alt_email) = 'tanyacruzyoga@gmail.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 531.00, '2024-01-15', NULL, 'Winter', 2024
FROM people p, products pr
WHERE (lower(p.email) = 'victoriajaneharvey@gmail.com' OR lower(p.alt_email) = 'victoriajaneharvey@gmail.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 590.00, '2024-01-15', NULL, 'Winter', 2024
FROM people p, products pr
WHERE (lower(p.email) = 'risa.misu@gmail.com' OR lower(p.alt_email) = 'risa.misu@gmail.com')
  AND pr.name = 'Yoga Nidra Teacher Training';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 895.00, '2025-04-15', 'Bundle', 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'mamaloveyogalondon@gmail.com' OR lower(p.alt_email) = 'mamaloveyogalondon@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 100hr Bundle';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 965.00, '2025-04-15', 'Bundle', 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'n.redston@proton.me' OR lower(p.alt_email) = 'n.redston@proton.me')
  AND pr.name = 'Breathwork Professional Training - 100hr Bundle';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 965.00, '2025-04-15', 'Bundle', 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'miricalvert@gmail.com' OR lower(p.alt_email) = 'miricalvert@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 100hr Bundle';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 965.00, '2025-04-15', 'Bundle', 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'clairelou_farrell@yahoo.co.uk' OR lower(p.alt_email) = 'clairelou_farrell@yahoo.co.uk')
  AND pr.name = 'Breathwork Professional Training - 100hr Bundle';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 540.00, '2025-04-15', 'Bundle', 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'freddiejenkins12@live.co.uk' OR lower(p.alt_email) = 'freddiejenkins12@live.co.uk')
  AND pr.name = 'Breathwork Professional Training - 100hr Bundle';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 972.00, '2025-04-15', 'Bundle', 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'virginiebreton@hotmail.com' OR lower(p.alt_email) = 'virginiebreton@hotmail.com')
  AND pr.name = 'Breathwork Professional Training - 100hr Bundle';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 965.00, '2025-04-15', 'Bundle', 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'natasha.c.obrien@gmail.com' OR lower(p.alt_email) = 'natasha.c.obrien@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 100hr Bundle';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 1080.00, '2025-04-15', 'Bundle', 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'celestine@vonmoltke.net' OR lower(p.alt_email) = 'celestine@vonmoltke.net')
  AND pr.name = 'Breathwork Professional Training - 100hr Bundle';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 665.00, '2025-04-15', NULL, 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'nicola.smith637@gmail.com' OR lower(p.alt_email) = 'nicola.smith637@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 665.00, '2025-04-15', NULL, 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'almi.adnane1@gmail.com' OR lower(p.alt_email) = 'almi.adnane1@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 720.00, '2025-04-15', NULL, 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'hannah@mayall.net' OR lower(p.alt_email) = 'hannah@mayall.net')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 665.00, '2025-04-15', NULL, 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'michele_timmins@hotmail.com' OR lower(p.alt_email) = 'michele_timmins@hotmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 684.00, '2025-04-15', NULL, 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'wildwellnessjunkies@gmail.com' OR lower(p.alt_email) = 'wildwellnessjunkies@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 600.00, '2025-04-15', NULL, 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'chepworth@gmail.com' OR lower(p.alt_email) = 'chepworth@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 665.00, '2025-04-15', NULL, 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'lcameroo@hotmail.com' OR lower(p.alt_email) = 'lcameroo@hotmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2025-04-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'mamaloveyogalondon@gmail.com' OR lower(p.alt_email) = 'mamaloveyogalondon@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2025-04-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'n.redston@proton.me' OR lower(p.alt_email) = 'n.redston@proton.me')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2025-04-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'miricalvert@gmail.com' OR lower(p.alt_email) = 'miricalvert@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2025-04-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'clairelou_farrell@yahoo.co.uk' OR lower(p.alt_email) = 'clairelou_farrell@yahoo.co.uk')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2025-04-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'freddiejenkins12@live.co.uk' OR lower(p.alt_email) = 'freddiejenkins12@live.co.uk')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2025-04-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'virginiebreton@hotmail.com' OR lower(p.alt_email) = 'virginiebreton@hotmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2025-04-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'natasha.c.obrien@gmail.com' OR lower(p.alt_email) = 'natasha.c.obrien@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2025-04-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'celestine@vonmoltke.net' OR lower(p.alt_email) = 'celestine@vonmoltke.net')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 425.00, '2025-04-15', NULL, 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'lyndsaykenwright@gmail.com' OR lower(p.alt_email) = 'lyndsaykenwright@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 425.00, '2025-04-15', NULL, 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'helenannem879@yahoo.co.uk' OR lower(p.alt_email) = 'helenannem879@yahoo.co.uk')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 425.00, '2025-04-15', NULL, 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'tom@letitbe.co.uk' OR lower(p.alt_email) = 'tom@letitbe.co.uk')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 425.00, '2025-04-15', NULL, 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'pascale.falempin@gmail.com' OR lower(p.alt_email) = 'pascale.falempin@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 425.00, '2025-04-15', NULL, 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'sfitzroy51@gmail.com' OR lower(p.alt_email) = 'sfitzroy51@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 425.00, '2025-04-15', NULL, 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'wafakhamri@hotmail.com' OR lower(p.alt_email) = 'wafakhamri@hotmail.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 425.00, '2025-04-15', NULL, 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'carolesimmons1@icloud.com' OR lower(p.alt_email) = 'carolesimmons1@icloud.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 425.00, '2025-04-15', NULL, 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'dg@marblesdesign.co.uk' OR lower(p.alt_email) = 'dg@marblesdesign.co.uk')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 425.00, '2025-04-15', NULL, 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'kristinahaladikova@gmail.com' OR lower(p.alt_email) = 'kristinahaladikova@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 425.00, '2025-04-15', NULL, 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'e.a.channing@me.com' OR lower(p.alt_email) = 'e.a.channing@me.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 425.00, '2025-04-15', NULL, 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'lornafultontherapy@gmail.com' OR lower(p.alt_email) = 'lornafultontherapy@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2025-04-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'n.redston@proton.me' OR lower(p.alt_email) = 'n.redston@proton.me')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2025-04-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'miricalvert@gmail.com' OR lower(p.alt_email) = 'miricalvert@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2025-04-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'clairelou_farrell@yahoo.co.uk' OR lower(p.alt_email) = 'clairelou_farrell@yahoo.co.uk')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2025-04-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'freddiejenkins12@live.co.uk' OR lower(p.alt_email) = 'freddiejenkins12@live.co.uk')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2025-04-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'virginiebreton@hotmail.com' OR lower(p.alt_email) = 'virginiebreton@hotmail.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2025-04-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Spring', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'natasha.c.obrien@gmail.com' OR lower(p.alt_email) = 'natasha.c.obrien@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 965.00, '2025-10-15', 'Bundle', 'Autumn', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'lucy.a.horton@gmail.com' OR lower(p.alt_email) = 'lucy.a.horton@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 100hr Bundle';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 972.00, '2025-10-15', 'Bundle', 'Autumn', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'eaglefeather4@mac.com' OR lower(p.alt_email) = 'eaglefeather4@mac.com')
  AND pr.name = 'Breathwork Professional Training - 100hr Bundle';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 965.00, '2025-10-15', 'Bundle', 'Autumn', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'vivienne.codjoe@gmail.com' OR lower(p.alt_email) = 'vivienne.codjoe@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 100hr Bundle';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 995.00, '2025-10-15', 'Bundle', 'Autumn', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'claire@allwright.me' OR lower(p.alt_email) = 'claire@allwright.me')
  AND pr.name = 'Breathwork Professional Training - 100hr Bundle';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 995.00, '2025-10-15', 'Bundle', 'Autumn', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'emilyjane59@icloud.com' OR lower(p.alt_email) = 'emilyjane59@icloud.com')
  AND pr.name = 'Breathwork Professional Training - 100hr Bundle';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 996.56, '2025-10-15', 'Bundle', 'Autumn', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'tgammonphd@gmail.com' OR lower(p.alt_email) = 'tgammonphd@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 100hr Bundle';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 965.00, '2025-10-15', 'Bundle', 'Autumn', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'oneconsciousbreath@gmail.com' OR lower(p.alt_email) = 'oneconsciousbreath@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 100hr Bundle';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 576.00, '2025-10-15', NULL, 'Autumn', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'keri.stewart1@hotmail.com' OR lower(p.alt_email) = 'keri.stewart1@hotmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 576.00, '2025-10-15', NULL, 'Autumn', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'angiebutterfield50@gmail.com' OR lower(p.alt_email) = 'angiebutterfield50@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 576.00, '2025-10-15', NULL, 'Autumn', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'sophie.wilkinson1@hotmail.co.uk' OR lower(p.alt_email) = 'sophie.wilkinson1@hotmail.co.uk')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 665.00, '2025-10-15', NULL, 'Autumn', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'leanneclayman@yahoo.com' OR lower(p.alt_email) = 'leanneclayman@yahoo.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 665.00, '2025-10-15', NULL, 'Autumn', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'philippatomlinson7@gmail.com' OR lower(p.alt_email) = 'philippatomlinson7@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 665.00, '2025-10-15', NULL, 'Autumn', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'mariepreaud.photography@gmail.com' OR lower(p.alt_email) = 'mariepreaud.photography@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2025-10-15', 'Scholarship', 'Autumn', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'dopico.carolina@gmail.com' OR lower(p.alt_email) = 'dopico.carolina@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 665.00, '2025-10-15', NULL, 'Autumn', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'pauladbw@mac.com' OR lower(p.alt_email) = 'pauladbw@mac.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2025-10-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Autumn', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'lucy.a.horton@gmail.com' OR lower(p.alt_email) = 'lucy.a.horton@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2025-10-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Autumn', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'eaglefeather4@mac.com' OR lower(p.alt_email) = 'eaglefeather4@mac.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2025-10-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Autumn', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'vivienne.codjoe@gmail.com' OR lower(p.alt_email) = 'vivienne.codjoe@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2025-10-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Autumn', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'claire@allwright.me' OR lower(p.alt_email) = 'claire@allwright.me')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2025-10-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Autumn', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'emilyjane59@icloud.com' OR lower(p.alt_email) = 'emilyjane59@icloud.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2025-10-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Autumn', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'tgammonphd@gmail.com' OR lower(p.alt_email) = 'tgammonphd@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2025-10-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Autumn', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'oneconsciousbreath@gmail.com' OR lower(p.alt_email) = 'oneconsciousbreath@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2025-10-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Autumn', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'celestine@vonmoltke.net' OR lower(p.alt_email) = 'celestine@vonmoltke.net')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2025-10-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Autumn', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'lucy.a.horton@gmail.com' OR lower(p.alt_email) = 'lucy.a.horton@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2025-10-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Autumn', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'vivienne.codjoe@gmail.com' OR lower(p.alt_email) = 'vivienne.codjoe@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2025-10-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Autumn', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'claire@allwright.me' OR lower(p.alt_email) = 'claire@allwright.me')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2025-10-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Autumn', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'emilyjane59@icloud.com' OR lower(p.alt_email) = 'emilyjane59@icloud.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2025-10-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Autumn', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'tgammonphd@gmail.com' OR lower(p.alt_email) = 'tgammonphd@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2025-10-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Autumn', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'oneconsciousbreath@gmail.com' OR lower(p.alt_email) = 'oneconsciousbreath@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 425.00, '2025-10-15', NULL, 'Autumn', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'richard.luke.benson@gmail.com' OR lower(p.alt_email) = 'richard.luke.benson@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2025-10-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Autumn', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'mamaloveyogalondon@gmail.com' OR lower(p.alt_email) = 'mamaloveyogalondon@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 384.00, '2025-10-15', NULL, 'Autumn', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'lcameroo@hotmail.com' OR lower(p.alt_email) = 'lcameroo@hotmail.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 300.00, '2025-10-15', NULL, 'Autumn', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'oneconsciousbreath@gmail.com' OR lower(p.alt_email) = 'oneconsciousbreath@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 425.00, '2025-10-15', NULL, 'Autumn', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'georgina0661@btinternet.com' OR lower(p.alt_email) = 'georgina0661@btinternet.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 480.00, '2025-10-15', NULL, 'Autumn', 2025
FROM people p, products pr
WHERE (lower(p.email) = 'k.jironet@icloud.com' OR lower(p.alt_email) = 'k.jironet@icloud.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', NULL, 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'richard_rowlands1@hotmail.com' OR lower(p.alt_email) = 'richard_rowlands1@hotmail.com')
  AND pr.name = 'Breathwork Professional Training - 100hr Bundle';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', NULL, 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'camillacarissaxx@gmail.com' OR lower(p.alt_email) = 'camillacarissaxx@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 100hr Bundle';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', NULL, 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'willdurkan@gmail.com' OR lower(p.alt_email) = 'willdurkan@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 100hr Bundle';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', NULL, 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'sardruce@hotmail.com' OR lower(p.alt_email) = 'sardruce@hotmail.com')
  AND pr.name = 'Breathwork Professional Training - 100hr Bundle';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', NULL, 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'sadiayc@gmail.com' OR lower(p.alt_email) = 'sadiayc@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 100hr Bundle';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', NULL, 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'danielle_blackie@hotmail.co.uk' OR lower(p.alt_email) = 'danielle_blackie@hotmail.co.uk')
  AND pr.name = 'Breathwork Professional Training - 100hr Bundle';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', NULL, 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'erikalawal@gmail.com' OR lower(p.alt_email) = 'erikalawal@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 100hr Bundle';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', NULL, 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'anthonyfalconer23@gmail.com' OR lower(p.alt_email) = 'anthonyfalconer23@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 100hr Bundle';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'richard_rowlands1@hotmail.com' OR lower(p.alt_email) = 'richard_rowlands1@hotmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'camillacarissaxx@gmail.com' OR lower(p.alt_email) = 'camillacarissaxx@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'willdurkan@gmail.com' OR lower(p.alt_email) = 'willdurkan@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'sardruce@hotmail.com' OR lower(p.alt_email) = 'sardruce@hotmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'sadiayc@gmail.com' OR lower(p.alt_email) = 'sadiayc@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'danielle_blackie@hotmail.co.uk' OR lower(p.alt_email) = 'danielle_blackie@hotmail.co.uk')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'erikalawal@gmail.com' OR lower(p.alt_email) = 'erikalawal@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'anthonyfalconer23@gmail.com' OR lower(p.alt_email) = 'anthonyfalconer23@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', NULL, 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'martin_taylor@me.com' OR lower(p.alt_email) = 'martin_taylor@me.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', NULL, 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'elizabethspalding@hotmail.co.uk' OR lower(p.alt_email) = 'elizabethspalding@hotmail.co.uk')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', NULL, 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'willettsue3@gmail.com' OR lower(p.alt_email) = 'willettsue3@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', NULL, 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'hershahanda@hotmail.com' OR lower(p.alt_email) = 'hershahanda@hotmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', NULL, 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'sophieramsay0@gmail.com' OR lower(p.alt_email) = 'sophieramsay0@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', NULL, 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'lcrompton@talktalk.net' OR lower(p.alt_email) = 'lcrompton@talktalk.net')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', NULL, 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'catriona970@gmail.com' OR lower(p.alt_email) = 'catriona970@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', NULL, 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'asanders100@hotmail.com' OR lower(p.alt_email) = 'asanders100@hotmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'richard_rowlands1@hotmail.com' OR lower(p.alt_email) = 'richard_rowlands1@hotmail.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'camillacarissaxx@gmail.com' OR lower(p.alt_email) = 'camillacarissaxx@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'willdurkan@gmail.com' OR lower(p.alt_email) = 'willdurkan@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'sardruce@hotmail.com' OR lower(p.alt_email) = 'sardruce@hotmail.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'sadiayc@gmail.com' OR lower(p.alt_email) = 'sadiayc@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'danielle_blackie@hotmail.co.uk' OR lower(p.alt_email) = 'danielle_blackie@hotmail.co.uk')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'erikalawal@gmail.com' OR lower(p.alt_email) = 'erikalawal@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'anthonyfalconer23@gmail.com' OR lower(p.alt_email) = 'anthonyfalconer23@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', NULL, 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'angiebutterfield50@gmail.com' OR lower(p.alt_email) = 'angiebutterfield50@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', 'Part of 100hr bundle -- price recorded on bundle record -- Transferred from Autumn 2025', 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'eaglefeather4@mac.com' OR lower(p.alt_email) = 'eaglefeather4@mac.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', NULL, 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'hannah@mayall.net' OR lower(p.alt_email) = 'hannah@mayall.net')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', NULL, 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'nandrew@me.com' OR lower(p.alt_email) = 'nandrew@me.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', NULL, 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'elizabethspalding@hotmail.co.uk' OR lower(p.alt_email) = 'elizabethspalding@hotmail.co.uk')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-10-15', NULL, 'Autumn', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'asanders100@hotmail.com' OR lower(p.alt_email) = 'asanders100@hotmail.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', NULL, 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'catriona970@gmail.com' OR lower(p.alt_email) = 'catriona970@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', NULL, 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'willettsue3@gmail.com' OR lower(p.alt_email) = 'willettsue3@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-04-15', NULL, 'Spring', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'mariepreaud@yahoo.com' OR lower(p.alt_email) = 'mariepreaud@yahoo.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 648.00, '2026-10-15', 'Scholarship', 'Autumn', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'isabellehughes95@gmail.com' OR lower(p.alt_email) = 'isabellehughes95@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 100hr Bundle';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-10-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Autumn', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'isabellehughes95@gmail.com' OR lower(p.alt_email) = 'isabellehughes95@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 60hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-10-15', 'Part of 100hr bundle -- price recorded on bundle record', 'Autumn', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'isabellehughes95@gmail.com' OR lower(p.alt_email) = 'isabellehughes95@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)
SELECT p.id, pr.id, 0.00, '2026-10-15', NULL, 'Autumn', 2026
FROM people p, products pr
WHERE (lower(p.email) = 'sophieramsay0@gmail.com' OR lower(p.alt_email) = 'sophieramsay0@gmail.com')
  AND pr.name = 'Breathwork Professional Training - 40hr';
