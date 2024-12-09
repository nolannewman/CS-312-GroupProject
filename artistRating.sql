-- Table: public.user_artist_ratings

-- DROP TABLE IF EXISTS public.user_artist_ratings;

CREATE TABLE IF NOT EXISTS public.user_artist_ratings
(
    id integer NOT NULL DEFAULT nextval('user_artist_ratings_id_seq'::regclass),
    user_id integer,
    artist character varying(255) COLLATE pg_catalog."default" NOT NULL,
    rating integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_artist_ratings_pkey PRIMARY KEY (id),
    CONSTRAINT user_artist_ratings_user_id_artist_key UNIQUE (user_id, artist),
    CONSTRAINT user_artist_ratings_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT user_artist_ratings_rating_check CHECK (rating >= 1 AND rating <= 5)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.user_artist_ratings
    OWNER to postgres;