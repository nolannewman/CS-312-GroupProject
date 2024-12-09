-- Table: public.user_song_ratings

-- DROP TABLE IF EXISTS public.user_song_ratings;

CREATE TABLE IF NOT EXISTS public.user_song_ratings
(
    id integer NOT NULL DEFAULT nextval('user_song_ratings_id_seq'::regclass),
    user_id integer,
    song_id integer,
    rating integer,
    CONSTRAINT user_song_ratings_pkey PRIMARY KEY (id),
    CONSTRAINT user_song_ratings_user_id_song_id_key UNIQUE (user_id, song_id),
    CONSTRAINT user_song_ratings_song_id_fkey FOREIGN KEY (song_id)
        REFERENCES public.songs (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT user_song_ratings_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT user_song_ratings_rating_check CHECK (rating >= 1 AND rating <= 5)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.user_song_ratings
    OWNER to postgres;