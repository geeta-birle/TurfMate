DO $$
BEGIN

-- Clear all data
DELETE FROM notifications;
DELETE FROM messages;
DELETE FROM refunds;
DELETE FROM match_players;
DELETE FROM matches;
DELETE FROM payments;
DELETE FROM bookings;
DELETE FROM time_slots;
DELETE FROM reviews;
DELETE FROM turfs;
DELETE FROM users;

-- USERS (password for all: Test1234)
INSERT INTO users(id,name,email,password_hash,phone,role,skill_level,city,bio,is_verified,is_active) VALUES
('a1000000-0000-0000-0000-000000000001','Admin User','admin@turfmate.com','$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeAqjKKxHJjdNTEIe','9000000001','admin','beginner','Pune','Platform administrator',TRUE,TRUE),
('a1000000-0000-0000-0000-000000000002','Rahul Sharma','rahul@gmail.com','$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeAqjKKxHJjdNTEIe','9876543201','owner','intermediate','Pune','Turf owner in Pune',TRUE,TRUE),
('a1000000-0000-0000-0000-000000000003','Priya Patel','priya@gmail.com','$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeAqjKKxHJjdNTEIe','9876543202','owner','beginner','Pune','Sports facility manager',TRUE,TRUE),
('a1000000-0000-0000-0000-000000000004','Arjun Mehta','arjun@gmail.com','$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeAqjKKxHJjdNTEIe','9876543203','player','advanced','Pune','Football player',TRUE,TRUE),
('a1000000-0000-0000-0000-000000000005','Sneha Joshi','sneha@gmail.com','$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeAqjKKxHJjdNTEIe','9876543204','player','intermediate','Pune','Cricket enthusiast',TRUE,TRUE),
('a1000000-0000-0000-0000-000000000006','Vikram Singh','vikram@gmail.com','$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeAqjKKxHJjdNTEIe','9876543205','player','beginner','Pune','Weekend warrior',TRUE,TRUE),
('a1000000-0000-0000-0000-000000000007','Anita Desai','anita@gmail.com','$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeAqjKKxHJjdNTEIe','9876543206','player','intermediate','Pune','Volleyball player',TRUE,TRUE);

-- TURFS
INSERT INTO turfs(id,owner_id,name,description,address,city,lat,lng,sport_types,surface_type,amenities,images,price_per_hour,is_active,is_approved,avg_rating,total_reviews) VALUES
(
  'b1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000002',
  'Green Arena Turf',
  'Premium football turf with floodlights',
  'Baner Road, Near Baner Bridge','Pune',
  18.5590,73.7868,
  ARRAY['football']::sport_type[],
  'artificial grass',
  ARRAY['parking','washroom','floodlights','changing room'],
  ARRAY['https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800'],
  1200.00,TRUE,TRUE,4.5,2
),
(
  'b1000000-0000-0000-0000-000000000002',
  'a1000000-0000-0000-0000-000000000002',
  'Champion Sports Complex',
  'Multi-sport complex with cricket and football',
  'Aundh Road, Opposite D-Mart','Pune',
  18.5579,73.8074,
  ARRAY['football','cricket','basketball']::sport_type[],
  'artificial grass',
  ARRAY['parking','washroom','floodlights','cafeteria'],
  ARRAY['https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800'],
  1500.00,TRUE,TRUE,4.2,1
),
(
  'b1000000-0000-0000-0000-000000000003',
  'a1000000-0000-0000-0000-000000000003',
  'Smash Badminton Academy',
  'Indoor badminton courts with wooden flooring',
  'Kothrud Main Road','Pune',
  18.5074,73.8077,
  ARRAY['badminton']::sport_type[],
  'wooden',
  ARRAY['washroom','air conditioning','equipment rental'],
  ARRAY['https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800'],
  600.00,TRUE,TRUE,4.7,1
),
(
  'b1000000-0000-0000-0000-000000000004',
  'a1000000-0000-0000-0000-000000000003',
  'Skyline Cricket Ground',
  'Full-size cricket ground with pitch',
  'Viman Nagar, Nagar Road','Pune',
  18.5679,73.9143,
  ARRAY['cricket']::sport_type[],
  'natural grass',
  ARRAY['parking','washroom','scoreboard'],
  ARRAY['https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800'],
  2000.00,TRUE,TRUE,4.0,0
),
(
  'b1000000-0000-0000-0000-000000000005',
  'a1000000-0000-0000-0000-000000000002',
  'Hadapsar Football Ground',
  'New turf pending admin approval',
  'Hadapsar, Pune','Pune',
  18.5074,73.9355,
  ARRAY['football']::sport_type[],
  'artificial grass',
  ARRAY['parking'],
  ARRAY[]::text[],
  800.00,TRUE,FALSE,0,0
);

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