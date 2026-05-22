DO $$
BEGIN

-- Clear all data
DELETE FROM notifications;
DELETE FROM messages;
DELETE FROM refunds;
DELETE FROM match_players;
DELETE FROM settlements;
DELETE FROM match_payments;
DELETE FROM matches;
DELETE FROM payments;
DELETE FROM bookings;
DELETE FROM time_slots;
DELETE FROM reviews;
DELETE FROM turfs;
DELETE FROM wallet_transactions;
DELETE FROM wallets;
DELETE FROM users;

-- USERS (password for all: Test1234)
INSERT INTO users(id,name,email,password_hash,phone,role,skill_level,city,bio,is_verified,is_active) VALUES
('a1000000-0000-0000-0000-000000000001','Admin User','admin@turfmate.com','$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeAqjKKxHJjdNTEIe','9000000001','admin','beginner','Pune','Platform administrator',TRUE,TRUE),
('a1000000-0000-0000-0000-000000000002','Rahul Sharma','rahul@gmail.com','$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeAqjKKxHJjdNTEIe','9876543201','owner','intermediate','Pune','Turf owner in Pune',TRUE,TRUE),
('a1000000-0000-0000-0000-000000000003','Priya Patel','priya@gmail.com','$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeAqjKKxHJjdNTEIe','9876543202','owner','beginner','Pune','Sports facility manager',TRUE,TRUE),
('a1000000-0000-0000-0000-000000000004','Arjun Mehta','arjun@gmail.com','$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeAqjKKxHJjdNTEIe','9876543203','player','advanced','Pune','Football player',TRUE,TRUE),
('a1000000-0000-0000-0000-000000000005','Sneha Joshi','sneha@gmail.com','$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeAqjKKxHJjdNTEIe','9876543204','player','intermediate','Pune','Cricket enthusiast',TRUE,TRUE),
('a1000000-0000-0000-0000-000000000006','Vikram Singh','vikram@gmail.com','$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeAqjKKxHJjdNTEIe','9876543205','player','beginner','Pune','Weekend warrior',TRUE,TRUE),
('a1000000-0000-0000-0000-000000000007','Anita Desai','anita@gmail.com','$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeAqjKKxHJjdNTEIe','9876543206','player','intermediate','Pune','Volleyball player',TRUE,TRUE),
-- Additional owners for turfs
('a1000000-0000-0000-0000-000000000008','Vivek Kumar','vivek@gmail.com','$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeAqjKKxHJjdNTEIe','9876543208','owner','intermediate','Pune','Sports entrepreneur',TRUE,TRUE),
('a1000000-0000-0000-0000-000000000009','Neha Singh','neha@gmail.com','$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeAqjKKxHJjdNTEIe','9876543209','owner','beginner','Mumbai','Mumbai turf operator',TRUE,TRUE),
('a1000000-0000-0000-0000-000000000010','Rohan Gupta','rohan@gmail.com','$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeAqjKKxHJjdNTEIe','9876543210','owner','advanced','Bangalore','Bangalore sports facility',TRUE,TRUE),
('a1000000-0000-0000-0000-000000000011','Nisha Reddy','nisha@gmail.com','$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeAqjKKxHJjdNTEIe','9876543211','owner','intermediate','Hyderabad','Hyderabad turf owner',TRUE,TRUE),
('a1000000-0000-0000-0000-000000000012','Sanjay Bhosale','sanjay@gmail.com','$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeAqjKKxHJjdNTEIe','9876543212','owner','beginner','Pune','Multi-sport owner',TRUE,TRUE);

-- TURFS (including 30+ random turfs)
INSERT INTO turfs(id,owner_id,name,description,address,city,lat,lng,sport_types,surface_type,amenities,images,price_per_hour,is_active,is_approved,avg_rating,total_reviews) VALUES
('b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000002','Green Arena Turf','Premium football turf with floodlights','Baner Road, Near Baner Bridge','Pune',18.5590,73.7868,ARRAY['football']::sport_type[],'artificial grass',ARRAY['parking','washroom','floodlights','changing room'],ARRAY['https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800'],1200.00,TRUE,TRUE,4.5,2),
('b1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000002','Champion Sports Complex','Multi-sport complex with cricket and football','Aundh Road, Opposite D-Mart','Pune',18.5579,73.8074,ARRAY['football','cricket','basketball']::sport_type[],'artificial grass',ARRAY['parking','washroom','floodlights','cafeteria'],ARRAY['https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800'],1500.00,TRUE,TRUE,4.2,1),
('b1000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000003','Smash Badminton Academy','Indoor badminton courts with wooden flooring','Kothrud Main Road','Pune',18.5074,73.8077,ARRAY['badminton']::sport_type[],'wooden',ARRAY['washroom','air conditioning','equipment rental'],ARRAY['https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800'],600.00,TRUE,TRUE,4.7,1),
('b1000000-0000-0000-0000-000000000004','a1000000-0000-0000-0000-000000000003','Skyline Cricket Ground','Full-size cricket ground with pitch','Viman Nagar, Nagar Road','Pune',18.5679,73.9143,ARRAY['cricket']::sport_type[],'natural grass',ARRAY['parking','washroom','scoreboard'],ARRAY['https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800'],2000.00,TRUE,TRUE,4.0,0),
('b1000000-0000-0000-0000-000000000005','a1000000-0000-0000-0000-000000000002','Hadapsar Football Ground','New turf pending admin approval','Hadapsar, Pune','Pune',18.5074,73.9355,ARRAY['football']::sport_type[],'artificial grass',ARRAY['parking'],ARRAY[]::text[],800.00,TRUE,FALSE,0,0),
('b1000000-0000-0000-0000-000000000006','a1000000-0000-0000-0000-000000000008','Pro Court Tennis Club','International standard tennis courts','Koregaon Park','Pune',18.5333,73.8667,ARRAY['tennis']::sport_type[],'hard court',ARRAY['parking','washroom','floodlights','cafeteria','coaching'],ARRAY['https://images.unsplash.com/photo-1554224311-beee415c15b7?w=800'],700.00,TRUE,TRUE,4.8,3),
('b1000000-0000-0000-0000-000000000007','a1000000-0000-0000-0000-000000000008','Volleyball Arena','Professional volleyball court','Kalyani Nagar','Pune',18.5500,73.8900,ARRAY['volleyball']::sport_type[],'wooden',ARRAY['parking','washroom','scoring system'],ARRAY['https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800'],500.00,TRUE,TRUE,4.3,2),
('b1000000-0000-0000-0000-000000000008','a1000000-0000-0000-0000-000000000008','Elite Basketball Court','Indoor basketball with AC','Shivajinagar','Pune',18.5200,73.8500,ARRAY['basketball']::sport_type[],'wooden',ARRAY['washroom','air conditioning','equipment rental'],ARRAY['https://images.unsplash.com/photo-1546519638-68711109bc77?w=800'],650.00,TRUE,TRUE,4.6,1),
('b1000000-0000-0000-0000-000000000009','a1000000-0000-0000-0000-000000000012','Premier Football Hub','State-of-art football facility','Wanowrie','Pune',18.5050,73.8620,ARRAY['football','futsal']::sport_type[],'artificial grass',ARRAY['parking','washroom','floodlights','changing room','cafeteria'],ARRAY['https://images.unsplash.com/photo-1517836357463-d25ddfcbf042?w=800'],1100.00,TRUE,TRUE,4.4,2),
('b1000000-0000-0000-0000-000000000010','a1000000-0000-0000-0000-000000000012','Badminton Planet','Multiple badminton courts','Magarpatta City','Pune',18.4900,73.9300,ARRAY['badminton']::sport_type[],'wooden',ARRAY['washroom','air conditioning','equipment rental','cafeteria'],ARRAY['https://images.unsplash.com/photo-1618083876423-371f11d18d6f?w=800'],550.00,TRUE,TRUE,4.5,3),
('b1000000-0000-0000-0000-000000000011','a1000000-0000-0000-0000-000000000012','Cricket Legacy Grounds','Premium cricket facility','Wagholi','Pune',18.5600,73.9600,ARRAY['cricket']::sport_type[],'natural grass',ARRAY['parking','washroom','scoreboard','cafeteria'],ARRAY['https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800'],1800.00,TRUE,TRUE,4.7,1),
('b1000000-0000-0000-0000-000000000012','a1000000-0000-0000-0000-000000000009','Mumbai Premier Courts','Central Mumbai location','Fort, Mumbai','Mumbai',19.0760,72.8335,ARRAY['tennis','badminton']::sport_type[],'hard court',ARRAY['parking','washroom','floodlights','cafeteria'],ARRAY['https://images.unsplash.com/photo-1554224311-beee415c15b7?w=800'],800.00,TRUE,TRUE,4.4,1),
('b1000000-0000-0000-0000-000000000013','a1000000-0000-0000-0000-000000000009','BKC Football Field','Premium football in BKC','Bandra Kurla Complex','Mumbai',19.0596,72.8295,ARRAY['football']::sport_type[],'artificial grass',ARRAY['parking','washroom','floodlights','changing room'],ARRAY['https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800'],1400.00,TRUE,TRUE,4.5,2),
('b1000000-0000-0000-0000-000000000014','a1000000-0000-0000-0000-000000000009','Powai Sports Hub','Multi-sport complex in Powai','Powai','Mumbai',19.1136,72.9044,ARRAY['cricket','football','basketball']::sport_type[],'artificial grass',ARRAY['parking','washroom','floodlights','cafeteria','changing room'],ARRAY['https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800'],1600.00,TRUE,TRUE,4.3,2),
('b1000000-0000-0000-0000-000000000015','a1000000-0000-0000-0000-000000000010','Bangalore Premier Court','Premium facilities in Bangalore','Whitefield','Bangalore',12.9698,77.7499,ARRAY['tennis','badminton']::sport_type[],'hard court',ARRAY['parking','washroom','floodlights','cafeteria'],ARRAY['https://images.unsplash.com/photo-1554224311-beee415c15b7?w=800'],750.00,TRUE,TRUE,4.6,2),
('b1000000-0000-0000-0000-000000000016','a1000000-0000-0000-0000-000000000010','Indiranagar Cricket Club','Cricket ground in Indiranagar','Indiranagar','Bangalore',12.9716,77.6412,ARRAY['cricket']::sport_type[],'natural grass',ARRAY['parking','washroom','scoreboard'],ARRAY['https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800'],1900.00,TRUE,TRUE,4.4,1),
('b1000000-0000-0000-0000-000000000017','a1000000-0000-0000-0000-000000000010','Koramangala Football Field','Football in tech hub','Koramangala','Bangalore',12.9352,77.6245,ARRAY['football']::sport_type[],'artificial grass',ARRAY['parking','washroom','floodlights','changing room'],ARRAY['https://images.unsplash.com/photo-1517836357463-d25ddfcbf042?w=800'],1250.00,TRUE,TRUE,4.5,1),
('b1000000-0000-0000-0000-000000000018','a1000000-0000-0000-0000-000000000011','Hyderabad Tech Park Sports','Multi-sport in tech park','HITEC City','Hyderabad',17.3608,78.4455,ARRAY['badminton','tennis','basketball']::sport_type[],'wooden',ARRAY['parking','washroom','air conditioning','cafeteria'],ARRAY['https://images.unsplash.com/photo-1618083876423-371f11d18d6f?w=800'],600.00,TRUE,TRUE,4.5,1),
('b1000000-0000-0000-0000-000000000019','a1000000-0000-0000-0000-000000000011','Hyderabad Cricket Stadium','Full cricket facility','Secunderabad','Hyderabad',17.3629,78.5433,ARRAY['cricket']::sport_type[],'natural grass',ARRAY['parking','washroom','scoreboard','cafeteria'],ARRAY['https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800'],2000.00,TRUE,TRUE,4.3,0),
('b1000000-0000-0000-0000-000000000020','a1000000-0000-0000-0000-000000000011','Banjara Hills Tennis Courts','Tennis in upscale area','Banjara Hills','Hyderabad',17.3711,78.4683,ARRAY['tennis']::sport_type[],'hard court',ARRAY['parking','washroom','floodlights','coaching'],ARRAY['https://images.unsplash.com/photo-1554224311-beee415c15b7?w=800'],700.00,TRUE,TRUE,4.7,2),
('b1000000-0000-0000-0000-000000000021','a1000000-0000-0000-0000-000000000002','Phoenix Futsal Arena','Indoor football facility','Pune-Bangalore Bypass','Pune',18.5400,73.9200,ARRAY['futsal']::sport_type[],'artificial grass',ARRAY['parking','washroom','floodlights'],ARRAY['https://images.unsplash.com/photo-1550355291-bbee04a92027?w=800'],900.00,TRUE,TRUE,4.4,1),
('b1000000-0000-0000-0000-000000000022','a1000000-0000-0000-0000-000000000002','Dempo Sports Academy','Cricket and football','Baner','Pune',18.5600,73.7900,ARRAY['cricket','football']::sport_type[],'natural grass',ARRAY['parking','washroom','cafeteria','coaching'],ARRAY['https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800'],1400.00,TRUE,TRUE,4.2,1),
('b1000000-0000-0000-0000-000000000023','a1000000-0000-0000-0000-000000000008','Basketball Championship Court','Basketball venue','Yerwada','Pune',18.5300,73.8800,ARRAY['basketball']::sport_type[],'wooden',ARRAY['parking','washroom','air conditioning'],ARRAY['https://images.unsplash.com/photo-1546519638-68711109bc77?w=800'],600.00,TRUE,TRUE,4.3,0),
('b1000000-0000-0000-0000-000000000024','a1000000-0000-0000-0000-000000000008','Badminton Express','Budget badminton courts','Nigdi','Pune',18.6200,73.8000,ARRAY['badminton']::sport_type[],'wooden',ARRAY['washroom','equipment rental'],ARRAY['https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800'],400.00,TRUE,TRUE,4.1,0),
('b1000000-0000-0000-0000-000000000025','a1000000-0000-0000-0000-000000000012','Lawn Tennis Championships','Premium tennis venue','Cantonment','Pune',18.5100,73.8700,ARRAY['tennis']::sport_type[],'hard court',ARRAY['parking','washroom','floodlights','coaching','cafeteria'],ARRAY['https://images.unsplash.com/photo-1554224311-beee415c15b7?w=800'],800.00,TRUE,TRUE,4.6,2),
('b1000000-0000-0000-0000-000000000026','a1000000-0000-0000-0000-000000000012','Central Cricket Valley','Budget cricket ground','Lohegaon','Pune',18.5800,73.8900,ARRAY['cricket']::sport_type[],'natural grass',ARRAY['parking','washroom'],ARRAY['https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800'],1200.00,TRUE,TRUE,4.0,0),
('b1000000-0000-0000-0000-000000000027','a1000000-0000-0000-0000-000000000009','Marine Drive Sports','Beach-view sports','Marine Drive','Mumbai',18.9538,72.8335,ARRAY['volleyball','football']::sport_type[],'sand',ARRAY['parking','washroom'],ARRAY['https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800'],450.00,TRUE,TRUE,4.2,1),
('b1000000-0000-0000-0000-000000000028','a1000000-0000-0000-0000-000000000009','Andheri Premier Arena','Multi-sport complex','Andheri East','Mumbai',19.1136,72.8697,ARRAY['cricket','football','basketball']::sport_type[],'artificial grass',ARRAY['parking','washroom','floodlights','cafeteria'],ARRAY['https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800'],1300.00,TRUE,TRUE,4.4,1),
('b1000000-0000-0000-0000-000000000029','a1000000-0000-0000-0000-000000000009','Navi Mumbai Sports Hub','Suburban facility','Nerul','Mumbai',19.0333,73.0167,ARRAY['badminton','tennis']::sport_type[],'wooden',ARRAY['parking','washroom','air conditioning'],ARRAY['https://images.unsplash.com/photo-1618083876423-371f11d18d6f?w=800'],550.00,TRUE,TRUE,4.3,0),
('b1000000-0000-0000-0000-000000000030','a1000000-0000-0000-0000-000000000010','Bangalore IT Park Sports','Corporate sports complex','Bangalore IT Park','Bangalore',12.9716,77.7063,ARRAY['badminton','football','cricket']::sport_type[],'artificial grass',ARRAY['parking','washroom','floodlights','cafeteria'],ARRAY['https://images.unsplash.com/photo-1517836357463-d25ddfcbf042?w=800'],1100.00,TRUE,TRUE,4.5,1),
('b1000000-0000-0000-0000-000000000031','a1000000-0000-0000-0000-000000000010','Ulsoor Cricket Club','Heritage cricket club','Ulsoor','Bangalore',12.9789,77.6245,ARRAY['cricket']::sport_type[],'natural grass',ARRAY['parking','washroom','scoring system','cafeteria'],ARRAY['https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800'],1800.00,TRUE,TRUE,4.6,2),
('b1000000-0000-0000-0000-000000000032','a1000000-0000-0000-0000-000000000010','HSR Layout Sports Arena','Neighborhood sports hub','HSR Layout','Bangalore',12.9698,77.6412,ARRAY['badminton','basketball']::sport_type[],'wooden',ARRAY['parking','washroom','equipment rental'],ARRAY['https://images.unsplash.com/photo-1618083876423-371f11d18d6f?w=800'],500.00,TRUE,TRUE,4.2,0),
('b1000000-0000-0000-0000-000000000033','a1000000-0000-0000-0000-000000000011','Gachibowli Football Field','Premium football venue','Gachibowli','Hyderabad',17.4690,78.4386,ARRAY['football']::sport_type[],'artificial grass',ARRAY['parking','washroom','floodlights','changing room'],ARRAY['https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800'],1250.00,TRUE,TRUE,4.5,1),
('b1000000-0000-0000-0000-000000000034','a1000000-0000-0000-0000-000000000011','Jubilee Hills Basketball Court','Indoor basketball','Jubilee Hills','Hyderabad',17.3917,78.4678,ARRAY['basketball']::sport_type[],'wooden',ARRAY['parking','washroom','air conditioning'],ARRAY['https://images.unsplash.com/photo-1546519638-68711109bc77?w=800'],600.00,TRUE,TRUE,4.4,0),
('b1000000-0000-0000-0000-000000000035','a1000000-0000-0000-0000-000000000011','Kondapur Badminton Club','Badminton court','Kondapur','Hyderabad',17.4592,78.3547,ARRAY['badminton']::sport_type[],'wooden',ARRAY['washroom','air conditioning','equipment rental'],ARRAY['https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800'],550.00,TRUE,TRUE,4.3,1);

-- TIME SLOTS - Green Arena Today
INSERT INTO time_slots(id,turf_id,date,start_time,end_time,status) VALUES
('c1000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001',CURRENT_DATE,'06:00','07:00','available'),
('c1000000-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000001',CURRENT_DATE,'07:00','08:00','available'),
('c1000000-0000-0000-0000-000000000003','b1000000-0000-0000-0000-000000000001',CURRENT_DATE,'08:00','09:00','booked'),
('c1000000-0000-0000-0000-000000000004','b1000000-0000-0000-0000-000000000001',CURRENT_DATE,'17:00','18:00','available'),
('c1000000-0000-0000-0000-000000000005','b1000000-0000-0000-0000-000000000001',CURRENT_DATE,'18:00','19:00','available'),
('c1000000-0000-0000-0000-000000000006','b1000000-0000-0000-0000-000000000001',CURRENT_DATE,'19:00','20:00','available'),
('c1000000-0000-0000-0000-000000000007','b1000000-0000-0000-0000-000000000001',CURRENT_DATE,'20:00','21:00','available');

-- TIME SLOTS - Green Arena Tomorrow
INSERT INTO time_slots(id,turf_id,date,start_time,end_time,status) VALUES
('c1000000-0000-0000-0000-000000000008','b1000000-0000-0000-0000-000000000001',CURRENT_DATE+1,'06:00','07:00','available'),
('c1000000-0000-0000-0000-000000000009','b1000000-0000-0000-0000-000000000001',CURRENT_DATE+1,'07:00','08:00','available'),
('c1000000-0000-0000-0000-000000000010','b1000000-0000-0000-0000-000000000001',CURRENT_DATE+1,'17:00','18:00','available'),
('c1000000-0000-0000-0000-000000000011','b1000000-0000-0000-0000-000000000001',CURRENT_DATE+1,'18:00','19:00','available');

-- TIME SLOTS - Champion Sports Today
INSERT INTO time_slots(id,turf_id,date,start_time,end_time,status) VALUES
('c2000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000002',CURRENT_DATE,'07:00','08:00','available'),
('c2000000-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000002',CURRENT_DATE,'08:00','09:00','available'),
('c2000000-0000-0000-0000-000000000003','b1000000-0000-0000-0000-000000000002',CURRENT_DATE,'17:00','18:00','booked'),
('c2000000-0000-0000-0000-000000000004','b1000000-0000-0000-0000-000000000002',CURRENT_DATE,'18:00','19:00','available'),
('c2000000-0000-0000-0000-000000000005','b1000000-0000-0000-0000-000000000002',CURRENT_DATE+1,'06:00','07:00','available'),
('c2000000-0000-0000-0000-000000000006','b1000000-0000-0000-0000-000000000002',CURRENT_DATE+1,'17:00','18:00','available');

-- TIME SLOTS - Smash Badminton
INSERT INTO time_slots(id,turf_id,date,start_time,end_time,status) VALUES
('c3000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000003',CURRENT_DATE,'06:00','07:00','available'),
('c3000000-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000003',CURRENT_DATE,'07:00','08:00','available'),
('c3000000-0000-0000-0000-000000000003','b1000000-0000-0000-0000-000000000003',CURRENT_DATE,'08:00','09:00','available'),
('c3000000-0000-0000-0000-000000000004','b1000000-0000-0000-0000-000000000003',CURRENT_DATE+1,'06:00','07:00','available');

-- TIME SLOTS - Skyline Cricket
INSERT INTO time_slots(id,turf_id,date,start_time,end_time,status) VALUES
('c4000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000004',CURRENT_DATE,'06:00','10:00','available'),
('c4000000-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000004',CURRENT_DATE+1,'06:00','10:00','available');

-- BOOKINGS
INSERT INTO bookings(id,slot_id,organizer_id,total_amount,platform_fee,status) VALUES
('d1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000004',1200.00,120.00,'confirmed'),
('d1000000-0000-0000-0000-000000000002','c2000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000005',1500.00,150.00,'confirmed');

-- PAYMENTS
INSERT INTO payments(booking_id,user_id,razorpay_order_id,razorpay_payment_id,amount,type,status) VALUES
('d1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000004','order_sample001','pay_sample001',1320.00,'booking','success'),
('d1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000005','order_sample002','pay_sample002',1650.00,'booking','success');

-- MATCHES
INSERT INTO matches(id,booking_id,title,sport_type,team_size,current_players,cost_per_player,skill_level,visibility,description,status,invite_code) VALUES
('e1000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000001','Sunday Morning 5-a-Side','football',10,3,120.00,'intermediate','open','Friendly match. All welcome.','open','MATCH1'),
('e1000000-0000-0000-0000-000000000002','d1000000-0000-0000-0000-000000000002','Corporate Cricket Challenge','cricket',22,4,150.00,'beginner','open','Fun cricket for office teams.','open','MATCH2');

-- MATCH PLAYERS
INSERT INTO match_players(match_id,player_id,status,payment_status) VALUES
('e1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000004','confirmed','success'),
('e1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000006','confirmed','success'),
('e1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000007','confirmed','pending'),
('e1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000005','confirmed','success'),
('e1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000004','confirmed','success'),
('e1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000006','confirmed','pending'),
('e1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000007','confirmed','pending');

-- REVIEWS
INSERT INTO reviews(reviewer_id,target_id,target_type,rating,comment) VALUES
('a1000000-0000-0000-0000-000000000004','b1000000-0000-0000-0000-000000000001','turf',5,'Amazing turf! Super clean.'),
('a1000000-0000-0000-0000-000000000005','b1000000-0000-0000-0000-000000000001','turf',4,'Great turf overall.'),
('a1000000-0000-0000-0000-000000000006','b1000000-0000-0000-0000-000000000003','turf',5,'Best badminton courts in Pune!');

-- NOTIFICATIONS
INSERT INTO notifications(user_id,type,title,message,is_read) VALUES
('a1000000-0000-0000-0000-000000000004','booking_confirmed','Booking Confirmed','Your booking at Green Arena Turf is confirmed!',FALSE),
('a1000000-0000-0000-0000-000000000004','player_joined','Player Joined','Vikram Singh joined your match.',FALSE),
('a1000000-0000-0000-0000-000000000005','booking_confirmed','Booking Confirmed','Your booking at Champion Sports is confirmed!',TRUE),
('a1000000-0000-0000-0000-000000000002','new_booking','New Booking','Green Arena has a new booking today.',FALSE);

-- UPDATE RATINGS
UPDATE turfs SET avg_rating=4.5,total_reviews=2 WHERE id='b1000000-0000-0000-0000-000000000001';
UPDATE turfs SET avg_rating=4.7,total_reviews=1 WHERE id='b1000000-0000-0000-0000-000000000003';

RAISE NOTICE 'Seed completed successfully!';

END $$;