--
-- PostgreSQL database dump
--

\restrict aOzIrhVtmmNFyM8fTI4Ae9grrkZ8v6DvacNDPP80Lukhhus9CdKyNDWGgsvQMgd

-- Dumped from database version 17.11
-- Dumped by pg_dump version 17.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings (
    id integer NOT NULL,
    client_id integer NOT NULL,
    worker_id integer NOT NULL,
    service_id integer NOT NULL,
    booking_date timestamp without time zone NOT NULL,
    location text NOT NULL,
    description text,
    labour_cost numeric(10,2) DEFAULT 0,
    material_cost numeric(10,2) DEFAULT 0,
    travel_charge numeric(10,2) DEFAULT 0,
    total_cost numeric(10,2) DEFAULT 0,
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    cancellation_reason text,
    workers_required integer DEFAULT 1 NOT NULL,
    materials_provided_by character varying(20) DEFAULT 'client'::character varying NOT NULL,
    platform_fee numeric DEFAULT 10.00,
    platform_upi_id character varying(100) DEFAULT '9392853535@fam'::character varying,
    CONSTRAINT bookings_materials_provided_by_check CHECK (((materials_provided_by)::text = ANY ((ARRAY['client'::character varying, 'worker'::character varying, 'shared'::character varying])::text[]))),
    CONSTRAINT bookings_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'committed'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'cancelled'::character varying, 'rejected'::character varying])::text[]))),
    CONSTRAINT bookings_workers_required_check CHECK (((workers_required >= 1) AND (workers_required <= 10)))
);


--
-- Name: bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bookings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bookings_id_seq OWNED BY public.bookings.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    booking_id integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_method character varying(30),
    payment_status character varying(30) DEFAULT 'pending'::character varying,
    transaction_id character varying(150),
    paid_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: platform_visits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_visits (
    id integer NOT NULL,
    user_id integer,
    user_role character varying(20),
    platform_fee numeric DEFAULT 10.00,
    platform_upi_id character varying(100) DEFAULT '9392853535@fam'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: platform_visits_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.platform_visits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: platform_visits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.platform_visits_id_seq OWNED BY public.platform_visits.id;


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id integer NOT NULL,
    booking_id integer NOT NULL,
    client_id integer NOT NULL,
    worker_id integer NOT NULL,
    rating integer NOT NULL,
    comment text,
    behaviour_rating integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    photos jsonb DEFAULT '[]'::jsonb,
    reviewer_type character varying(20) DEFAULT 'client'::character varying,
    CONSTRAINT reviews_behaviour_rating_check CHECK (((behaviour_rating >= 1) AND (behaviour_rating <= 5))),
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reviews_id_seq OWNED BY public.reviews.id;


--
-- Name: services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.services (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    category character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: services_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.services_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: services_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.services_id_seq OWNED BY public.services.id;


--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_tickets (
    id integer NOT NULL,
    user_id integer NOT NULL,
    subject character varying(200) NOT NULL,
    description text NOT NULL,
    status character varying(30) DEFAULT 'open'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT support_tickets_status_check CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'in_progress'::character varying, 'resolved'::character varying, 'closed'::character varying])::text[])))
);


--
-- Name: support_tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.support_tickets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: support_tickets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.support_tickets_id_seq OWNED BY public.support_tickets.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    password_hash text NOT NULL,
    role character varying(20) NOT NULL,
    phone character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_email_verified boolean DEFAULT true,
    email_verification_token character varying(255),
    avatar_url text,
    client_rating numeric(3,2) DEFAULT 0.00,
    client_total_reviews integer DEFAULT 0,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['client'::character varying, 'worker'::character varying, 'admin'::character varying])::text[])))
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: worker_availability; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.worker_availability (
    id integer NOT NULL,
    worker_id integer NOT NULL,
    day_of_week character varying(10) NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    is_available boolean DEFAULT true,
    schedule_type character varying(50) DEFAULT 'permanent'::character varying,
    valid_month character varying(7) DEFAULT NULL::character varying,
    start_date date,
    end_date date,
    CONSTRAINT valid_day_of_week CHECK (((day_of_week)::text = ANY ((ARRAY['Monday'::character varying, 'Tuesday'::character varying, 'Wednesday'::character varying, 'Thursday'::character varying, 'Friday'::character varying, 'Saturday'::character varying, 'Sunday'::character varying])::text[]))),
    CONSTRAINT valid_time_range CHECK ((end_time > start_time))
);


--
-- Name: worker_availability_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.worker_availability_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: worker_availability_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.worker_availability_id_seq OWNED BY public.worker_availability.id;


--
-- Name: worker_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.worker_profiles (
    id integer NOT NULL,
    user_id integer NOT NULL,
    bio text,
    location character varying(150),
    hourly_rate numeric(10,2),
    experience_years integer DEFAULT 0,
    is_available boolean DEFAULT true,
    rating numeric(3,2) DEFAULT 0,
    total_reviews integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: worker_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.worker_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: worker_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.worker_profiles_id_seq OWNED BY public.worker_profiles.id;


--
-- Name: worker_services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.worker_services (
    worker_id integer NOT NULL,
    service_id integer NOT NULL
);


--
-- Name: bookings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings ALTER COLUMN id SET DEFAULT nextval('public.bookings_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: platform_visits id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_visits ALTER COLUMN id SET DEFAULT nextval('public.platform_visits_id_seq'::regclass);


--
-- Name: reviews id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews ALTER COLUMN id SET DEFAULT nextval('public.reviews_id_seq'::regclass);


--
-- Name: services id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services ALTER COLUMN id SET DEFAULT nextval('public.services_id_seq'::regclass);


--
-- Name: support_tickets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets ALTER COLUMN id SET DEFAULT nextval('public.support_tickets_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: worker_availability id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.worker_availability ALTER COLUMN id SET DEFAULT nextval('public.worker_availability_id_seq'::regclass);


--
-- Name: worker_profiles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.worker_profiles ALTER COLUMN id SET DEFAULT nextval('public.worker_profiles_id_seq'::regclass);


--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bookings (id, client_id, worker_id, service_id, booking_date, location, description, labour_cost, material_cost, travel_charge, total_cost, status, created_at, cancellation_reason, workers_required, materials_provided_by, platform_fee, platform_upi_id) FROM stdin;
1	1	1	1	2026-08-30 10:00:00	Hyderabad	Electrical repair work at home	500.00	0.00	0.00	500.00	completed	2026-08-29 11:36:15.804027	\N	1	client	10.00	9392853535@fam
5	1	1	1	2026-09-03 10:00:00	Hyderabad	Test cancellation booking	900.00	0.00	0.00	900.00	cancelled	2026-08-29 11:57:16.009055	\N	1	client	10.00	9392853535@fam
4	1	1	1	2026-09-02 10:00:00	Hyderabad	Electrical repair	800.00	0.00	0.00	800.00	cancelled	2026-08-29 11:38:27.641928	Medical emergency and unable to attend the scheduled job.	1	client	10.00	9392853535@fam
3	1	1	1	2026-09-01 10:00:00	Hyderabad	Electrical maintenance	600.00	100.00	50.00	750.00	completed	2026-08-29 11:38:08.918681	\N	1	client	10.00	9392853535@fam
6	1	1	1	2026-09-05 10:00:00	Hyderabad	Final end-to-end HelpHub test	600.00	150.00	50.00	800.00	completed	2026-08-29 15:31:34.576857	\N	1	client	10.00	9392853535@fam
2	1	1	1	2026-08-31 10:00:00	Hyderabad	Electrical installation	700.00	0.00	0.00	700.00	completed	2026-08-29 11:37:32.678339	\N	1	client	10.00	9392853535@fam
8	1	1	4	2026-09-03 13:45:00	hyberabad	floor cleaning	350.00	0.00	0.00	350.00	rejected	2026-09-02 12:45:14.517915	\N	1	client	10.00	9392853535@fam
7	1	1	1	2026-09-02 00:12:00	hyderabad	\N	500.00	0.00	0.00	500.00	accepted	2026-09-02 12:12:08.226682	\N	1	client	10.00	9392853535@fam
9	1	1	1	2026-09-03 10:17:00	hyderabad	fan broke down	300.00	0.00	0.00	300.00	completed	2026-09-03 10:18:07.455701	\N	1	client	10.00	9392853535@fam
11	1	1	7	2026-09-05 15:33:00	bollaram	water is coming from ac	500.00	0.00	0.00	500.00	completed	2026-09-03 15:33:55.207461	\N	1	client	10.00	9392853535@fam
10	1	1	1	2026-09-05 15:24:00	HYDERABAD	good at work	500.00	0.00	0.00	500.00	cancelled	2026-09-03 15:24:49.981312	I no longer need this service.	1	client	10.00	9392853535@fam
12	1	1	5	2026-09-08 10:08:00	hyderabad	desdgfdshtf	600.00	0.00	0.00	600.00	cancelled	2026-09-06 19:09:58.952965	I no longer need this service.	1	worker	10.00	9392853535@fam
13	1	1	1	2026-09-07 10:38:00	dgfvcdfv	efsdv	600.00	0.00	0.00	600.00	cancelled	2026-09-06 19:39:06.408888	No longer need the service: ergrstrhb	1	worker	10.00	9392853535@fam
14	1	1	1	2026-09-14 10:00:00	Functionality audit test location	Temporary end-to-end booking test	500.00	0.00	0.00	500.00	cancelled	2026-09-08 10:45:04.471283	Functionality audit cleanup	1	client	10.00	9392853535@fam
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payments (id, booking_id, amount, payment_method, payment_status, transaction_id, paid_at, created_at) FROM stdin;
1	2	700.00	online	paid	HH-1787986902516	2026-08-29 12:31:42.516	2026-08-29 12:31:42.517738
2	3	750.00	online	paid	HH-1787989240122	2026-08-29 13:10:40.122	2026-08-29 13:10:40.125363
3	6	800.00	online	paid	HH-1787998133758	2026-08-29 15:38:53.758	2026-08-29 15:38:53.763087
4	1	500.00	online	paid	HH-1788344742959	2026-09-02 15:55:42.959	2026-09-02 15:55:42.959955
\.


--
-- Data for Name: platform_visits; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.platform_visits (id, user_id, user_role, platform_fee, platform_upi_id, created_at) FROM stdin;
1	2	worker	10.00	9392853535@fam	2026-09-07 11:01:42.310779
2	2	worker	10.00	9392853535@fam	2026-09-07 11:01:42.314986
3	1	client	10.00	9392853535@fam	2026-09-07 11:12:23.831708
4	1	client	10.00	9392853535@fam	2026-09-07 11:12:23.834145
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reviews (id, booking_id, client_id, worker_id, rating, comment, behaviour_rating, created_at, photos, reviewer_type) FROM stdin;
2	9	1	1	4	good	5	2026-09-03 14:26:12.727318	[]	client
3	1	1	1	4	ok	3	2026-09-04 11:04:25.647817	[]	client
\.


--
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.services (id, name, description, category, created_at) FROM stdin;
1	Electrical	Electrical installation, repair and maintenance	Home Services	2026-08-27 19:44:15.246638
2	Plumbing	Plumbing installation and repair services	Home Services	2026-08-27 19:44:15.246638
3	Painting	Interior and exterior painting services	Home Services	2026-08-27 19:44:15.246638
4	Cleaning	Home and office cleaning services	Home Services	2026-08-27 19:44:15.246638
5	Construction	Construction and building related services	Construction	2026-08-27 19:44:15.246638
6	Carpentry	Furniture and woodwork services	Home Services	2026-08-27 19:44:15.246638
7	AC Repair	Air conditioner installation and repair	Appliance Services	2026-08-27 19:44:15.246638
8	Appliance Repair	Repair and maintenance of home appliances	Appliance Services	2026-08-27 19:44:15.246638
9	General Labour	General labour and assistance services	Labour	2026-08-27 19:44:15.246638
10	Other	Other professional services	Other	2026-08-27 19:44:15.246638
\.


--
-- Data for Name: support_tickets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.support_tickets (id, user_id, subject, description, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, name, email, password_hash, role, phone, created_at, is_email_verified, email_verification_token, avatar_url, client_rating, client_total_reviews) FROM stdin;
1	Test Client	testclient@gmail.com	$2b$12$gWF8jUewlN/fcTHK5zCfWOHJqAHRl9DL0IQ4/A1cC60Ge1Lp1z/Za	client	9876543210	2026-08-27 19:26:25.941361	t	\N	\N	0.00	0
3	Verify Test User	verifyuser@gmail.com	$2b$12$9zsJaqOaNmf1ERySqPB5OucGZIHR7ZLtwBslC.GtXAE3m.f.kvQU6	client	+91 99999 88888	2026-09-07 09:49:43.29274	t	\N	\N	0.00	0
2	Test Worker Updated	testworker@gmail.com	$2b$12$gWF8jUewlN/fcTHK5zCfWOHJqAHRl9DL0IQ4/A1cC60Ge1Lp1z/Za	client	9876543211	2026-08-27 19:40:04.292906	t	\N	\N	0.00	0
\.


--
-- Data for Name: worker_availability; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.worker_availability (id, worker_id, day_of_week, start_time, end_time, is_available, schedule_type, valid_month, start_date, end_date) FROM stdin;
4	1	Monday	09:00:00	18:00:00	t	permanent	\N	\N	\N
5	1	Tuesday	10:00:00	17:00:00	t	permanent	\N	\N	\N
6	1	Saturday	09:30:00	16:30:00	t	permanent	\N	\N	\N
\.


--
-- Data for Name: worker_profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.worker_profiles (id, user_id, bio, location, hourly_rate, experience_years, is_available, rating, total_reviews, created_at) FROM stdin;
1	2	Experienced electrician providing reliable electrical services.	Hyderabad	600.00	4	t	4.00	2	2026-08-27 19:42:29.871542
\.


--
-- Data for Name: worker_services; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.worker_services (worker_id, service_id) FROM stdin;
1	1
\.


--
-- Name: bookings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bookings_id_seq', 14, true);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.payments_id_seq', 4, true);


--
-- Name: platform_visits_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.platform_visits_id_seq', 4, true);


--
-- Name: reviews_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.reviews_id_seq', 3, true);


--
-- Name: services_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.services_id_seq', 10, true);


--
-- Name: support_tickets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.support_tickets_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 3, true);


--
-- Name: worker_availability_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.worker_availability_id_seq', 6, true);


--
-- Name: worker_profiles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.worker_profiles_id_seq', 1, true);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: payments payments_booking_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_booking_id_key UNIQUE (booking_id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: platform_visits platform_visits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_visits
    ADD CONSTRAINT platform_visits_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_booking_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_booking_id_key UNIQUE (booking_id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: payments unique_booking_payment; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT unique_booking_payment UNIQUE (booking_id);


--
-- Name: payments unique_payment_booking; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT unique_payment_booking UNIQUE (booking_id);


--
-- Name: reviews unique_review_booking; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT unique_review_booking UNIQUE (booking_id);


--
-- Name: worker_availability unique_worker_day; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.worker_availability
    ADD CONSTRAINT unique_worker_day UNIQUE (worker_id, day_of_week);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: worker_availability worker_availability_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.worker_availability
    ADD CONSTRAINT worker_availability_pkey PRIMARY KEY (id);


--
-- Name: worker_profiles worker_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.worker_profiles
    ADD CONSTRAINT worker_profiles_pkey PRIMARY KEY (id);


--
-- Name: worker_profiles worker_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.worker_profiles
    ADD CONSTRAINT worker_profiles_user_id_key UNIQUE (user_id);


--
-- Name: worker_services worker_services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.worker_services
    ADD CONSTRAINT worker_services_pkey PRIMARY KEY (worker_id, service_id);


--
-- Name: idx_bookings_booking_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_booking_date ON public.bookings USING btree (booking_date);


--
-- Name: idx_bookings_client_id_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_client_id_status ON public.bookings USING btree (client_id, status);


--
-- Name: idx_bookings_worker_id_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_worker_id_status ON public.bookings USING btree (worker_id, status);


--
-- Name: idx_reviews_booking_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_booking_id ON public.reviews USING btree (booking_id);


--
-- Name: idx_reviews_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_client_id ON public.reviews USING btree (client_id);


--
-- Name: idx_reviews_reviewer_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_reviewer_type ON public.reviews USING btree (reviewer_type);


--
-- Name: idx_reviews_worker_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_worker_id ON public.reviews USING btree (worker_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_worker_availability_day; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_worker_availability_day ON public.worker_availability USING btree (worker_id, day_of_week);


--
-- Name: idx_worker_availability_worker_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_worker_availability_worker_id ON public.worker_availability USING btree (worker_id);


--
-- Name: idx_worker_profiles_is_available; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_worker_profiles_is_available ON public.worker_profiles USING btree (is_available);


--
-- Name: idx_worker_profiles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_worker_profiles_user_id ON public.worker_profiles USING btree (user_id);


--
-- Name: bookings bookings_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id);


--
-- Name: bookings bookings_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id);


--
-- Name: bookings bookings_worker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.worker_profiles(id);


--
-- Name: worker_availability fk_worker_availability; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.worker_availability
    ADD CONSTRAINT fk_worker_availability FOREIGN KEY (worker_id) REFERENCES public.worker_profiles(id) ON DELETE CASCADE;


--
-- Name: payments payments_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: platform_visits platform_visits_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_visits
    ADD CONSTRAINT platform_visits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: reviews reviews_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: reviews reviews_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id);


--
-- Name: reviews reviews_worker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.worker_profiles(id);


--
-- Name: support_tickets support_tickets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: worker_profiles worker_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.worker_profiles
    ADD CONSTRAINT worker_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: worker_services worker_services_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.worker_services
    ADD CONSTRAINT worker_services_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;


--
-- Name: worker_services worker_services_worker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.worker_services
    ADD CONSTRAINT worker_services_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.worker_profiles(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict aOzIrhVtmmNFyM8fTI4Ae9grrkZ8v6DvacNDPP80Lukhhus9CdKyNDWGgsvQMgd

