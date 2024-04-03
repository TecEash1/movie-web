/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-plusplus */
/* eslint-disable react-hooks/rules-of-hooks */
import React, { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/blur.css";
import { useNavigate } from "react-router-dom";

import { ThinContainer } from "@/components/layout/ThinContainer";
import { WideContainer } from "@/components/layout/WideContainer";
import { HomeLayout } from "@/pages/layouts/HomeLayout";
import { conf } from "@/setup/config";
import { useThemeStore } from "@/stores/theme";

import { allThemes } from "../../themes/all";
import { get } from "../backend/metadata/tmdb";
import { Icon, Icons } from "../components/Icon";

const pagesToFetch = 5;

// Define the Media type
interface Media {
  id: number;
  poster_path: string;
  title?: string;
  name?: string;
}

// Update the Movie and TVShow interfaces to extend the Media interface
interface Movie extends Media {
  title: string;
}

interface TVShow extends Media {
  name: string;
}

// Define the Genre type
interface Genre {
  id: number;
  name: string;
}

// Define the Category type
interface Category {
  name: string;
  endpoint: string;
}

// Define the categories
const categories: Category[] = [
  {
    name: "Now Playing",
    endpoint: "/movie/now_playing?language=en-US",
  },
  {
    name: "Popular",
    endpoint: "/movie/popular?language=en-US",
  },
  {
    name: "Top Rated",
    endpoint: "/movie/top_rated?language=en-US",
  },
];

export function ExplorePage() {
  const { t } = useTranslation();
  const [showBg] = useState<boolean>(false);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [randomMovie, setRandomMovie] = useState<Movie | null>(null); // Add this line
  const [genreMovies, setGenreMovies] = useState<{
    [genreId: number]: Movie[];
  }>({});
  const [countdown, setCountdown] = useState<number | null>(null);
  const navigate = useNavigate();
  const themeName = useThemeStore((s) => s.theme);
  const currentTheme = allThemes.find((y) => y.name === themeName);
  const bgColor = currentTheme?.extend?.colors?.background?.main ?? "#0a0a12";
  // Add a new state variable for the category movies
  const [categoryMovies, setCategoryMovies] = useState<{
    [categoryName: string]: Movie[];
  }>({});

  useEffect(() => {
    const fetchMoviesForCategory = async (category: Category) => {
      try {
        const movies: any[] = [];
        for (let page = 1; page <= pagesToFetch; page++) {
          const data = await get<any>(category.endpoint, {
            api_key: conf().TMDB_READ_API_KEY,
            language: "en-US",
            page: page.toString(),
          });

          movies.push(...data.results);
        }
        setCategoryMovies((prevCategoryMovies) => ({
          ...prevCategoryMovies,
          [category.name]: movies,
        }));
      } catch (error) {
        console.error(
          `Error fetching movies for category ${category.name}:`,
          error,
        );
      }
    };
    categories.forEach(fetchMoviesForCategory);
  }, []);

  // Add a new state variable for the TV show genres
  const [tvGenres, setTVGenres] = useState<Genre[]>([]);

  // Add a new state variable for the TV shows
  const [tvShowGenres, setTVShowGenres] = useState<{
    [genreId: number]: TVShow[];
  }>({});

  // Fetch TV show genres
  useEffect(() => {
    const fetchTVGenres = async () => {
      try {
        const data = await get<any>("/genre/tv/list", {
          api_key: conf().TMDB_READ_API_KEY,
          language: "en-US",
        });

        setTVGenres(data.genres);
      } catch (error) {
        console.error("Error fetching TV show genres:", error);
      }
    };

    fetchTVGenres();
  }, []);

  // Fetch TV shows for each genre
  useEffect(() => {
    const fetchTVShowsForGenre = async (genreId: number) => {
      try {
        const tvShows: any[] = [];
        for (let page = 1; page <= pagesToFetch; page++) {
          const data = await get<any>("/discover/tv", {
            api_key: conf().TMDB_READ_API_KEY,
            with_genres: genreId.toString(),
            language: "en-US",
            page: page.toString(),
          });

          tvShows.push(...data.results);
        }
        setTVShowGenres((prevTVShowGenres) => ({
          ...prevTVShowGenres,
          [genreId]: tvShows,
        }));
      } catch (error) {
        console.error(`Error fetching TV shows for genre ${genreId}:`, error);
      }
    };

    tvGenres.forEach((genre) => fetchTVShowsForGenre(genre.id));
  }, [tvGenres]);

  // Move the hooks outside of the renderMovies function
  const carouselRef = useRef<HTMLDivElement>(null);
  const carouselRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const gradientRef = useRef<HTMLDivElement>(null);

  // Update the scrollCarousel function to use the new ref map
  function scrollCarousel(categorySlug: string, direction: string) {
    const carousel = carouselRefs.current[categorySlug];
    if (carousel) {
      const movieElements = carousel.getElementsByTagName("a");
      if (movieElements.length > 0) {
        const movieWidth = movieElements[0].offsetWidth;
        const visibleMovies = Math.floor(carousel.offsetWidth / movieWidth);
        const scrollAmount = movieWidth * visibleMovies;
        if (direction === "left") {
          carousel.scrollBy({ left: -scrollAmount, behavior: "smooth" });
        } else {
          carousel.scrollBy({ left: scrollAmount, behavior: "smooth" });
        }
      }
    }
  }

  const [movieWidth, setMovieWidth] = useState(
    window.innerWidth < 600 ? "150px" : "200px",
  );

  useEffect(() => {
    const handleResize = () => {
      setMovieWidth(window.innerWidth < 600 ? "150px" : "200px");
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (carouselRef.current && gradientRef.current) {
      const carouselHeight = carouselRef.current.getBoundingClientRect().height;
      gradientRef.current.style.top = `${carouselHeight}px`;
      gradientRef.current.style.bottom = `${carouselHeight}px`;
    }
  }, [movieWidth]); // Added movieWidth to the dependency array

  function renderMovies(medias: Media[], category: string, isTVShow = false) {
    const categorySlug = category.toLowerCase().replace(/ /g, "-"); // Convert the category to a slug
    const displayCategory =
      category === "Now Playing"
        ? "In Cinemas"
        : category.includes("Movie")
          ? `${category}s`
          : isTVShow
            ? `${category} Programmes`
            : `${category} Movies`;
    return (
      <div className="relative overflow-hidden mt-4">
        <h2 className="text-2xl font-bold text-white sm:text-3xl md:text-2xl mx-auto pl-10">
          {displayCategory}
        </h2>
        <div
          id={`carousel-${categorySlug}`}
          className="flex whitespace-nowrap overflow-auto scroll-snap-x-mandatory pb-4 mt-4 pl-10"
          ref={(el) => {
            carouselRefs.current[categorySlug] = el;
          }}
        >
          {medias.slice(0, 100).map((media) => (
            <a
              key={media.id}
              href={`media/tmdb-${isTVShow ? "tv" : "movie"}-${media.id}-${
                isTVShow ? media.name : media.title
              }`}
              rel="noopener noreferrer"
              className="block text-center relative overflow-hidden transition-transform transform hover:scale-105 mr-4"
              style={{ flex: "0 0 auto", width: movieWidth }} // Set a fixed width for each movie
            >
              <LazyLoadImage
                src={`https://image.tmdb.org/t/p/w500${media.poster_path}`}
                alt={isTVShow ? media.name : media.title}
                effect="blur"
                className="rounded-xl mb-2"
                style={{
                  width: "100%",
                  height: "auto",
                  transform: "scale(1)",
                  transition: "opacity 0.3s, transform 0.3s",
                }}
              />
              <div
                className="absolute rounded-xl flex items-center justify-center text-white font-bold opacity-0 hover:opacity-100 transition-opacity"
                style={{
                  backdropFilter: "blur(0px)",
                  transition: "opacity 0.5s",
                  backgroundColor: "rgba(0, 0, 0, 0.8)", // Darkening effect
                  whiteSpace: "normal", // Allow the text to wrap to the next line
                  wordWrap: "break-word", // Break words to prevent overflow
                }}
              >
                <p className="text-sm m-4">
                  {isTVShow ? media.name : media.title}
                </p>
              </div>
            </a>
          ))}
        </div>
        <div
          className="absolute top-10 bottom-10 left-0 w-10"
          style={{
            background: `linear-gradient(90deg, ${bgColor} 0%, transparent 100%)`,
          }}
        />
        <div
          className="absolute top-10 bottom-10 right-0 w-10"
          style={{
            background: `linear-gradient(270deg, ${bgColor} 0%, transparent 100%)`,
          }}
        />
        <button
          type="button" // Added type attribute with value "button"
          className="absolute top-1/2 left-2 transform -translate-y-1/2 z-10"
          onClick={() => scrollCarousel(categorySlug, "left")}
        >
          <Icon icon={Icons.ARROW_LEFT} />
        </button>
        <button
          type="button" // Added type attribute with value "button"
          className="absolute top-1/2 right-2 transform -translate-y-1/2 z-10"
          onClick={() => scrollCarousel(categorySlug, "right")}
        >
          <Icon icon={Icons.ARROW_RIGHT} />
        </button>
      </div>
    );
  }

  const [countdownTimeout, setCountdownTimeout] =
    useState<NodeJS.Timeout | null>(null);

  const handleRandomMovieClick = () => {
    const allMovies = Object.values(genreMovies).flat(); // Flatten all movie arrays
    const randomIndex = Math.floor(Math.random() * allMovies.length);
    const selectedMovie = allMovies[randomIndex];
    setRandomMovie(selectedMovie);

    if (countdown !== null && countdown > 0) {
      // Clear the countdown interval
      setCountdown(null);
      if (countdownTimeout) {
        clearTimeout(countdownTimeout);
        setCountdownTimeout(null);
        setRandomMovie(null);
      }
    } else {
      setCountdown(5);

      // Schedule navigation after 5 seconds
      const timeoutId = setTimeout(() => {
        navigate(
          `/media/tmdb-movie-${selectedMovie.id}-${selectedMovie.title}`,
        );
      }, 5000);
      setCountdownTimeout(timeoutId);
    }
  };

  // Fetch Movie genres
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const data = await get<any>("/genre/movie/list", {
          api_key: conf().TMDB_READ_API_KEY,
          language: "en-US",
        });

        setGenres(data.genres);
      } catch (error) {
        console.error("Error fetching genres:", error);
      }
    };

    fetchGenres();
  }, []);

  // Fetch movies for each genre
  useEffect(() => {
    const fetchMoviesForGenre = async (genreId: number) => {
      try {
        const movies: any[] = [];
        for (let page = 1; page <= pagesToFetch; page++) {
          const data = await get<any>("/discover/movie", {
            api_key: conf().TMDB_READ_API_KEY,
            with_genres: genreId.toString(),
            language: "en-US",
            page: page.toString(),
          });

          movies.push(...data.results);
        }
        setGenreMovies((prevGenreMovies) => ({
          ...prevGenreMovies,
          [genreId]: movies,
        }));
      } catch (error) {
        console.error(`Error fetching movies for genre ${genreId}:`, error);
      }
    };

    genres.forEach((genre) => fetchMoviesForGenre(genre.id));
  }, [genres]);
  useEffect(() => {
    let countdownInterval: NodeJS.Timeout;
    if (countdown !== null && countdown > 0) {
      countdownInterval = setInterval(() => {
        setCountdown((prevCountdown) =>
          prevCountdown !== null ? prevCountdown - 1 : prevCountdown,
        );
      }, 1000);
    }

    return () => {
      clearInterval(countdownInterval);
    };
  }, [countdown]);

  return (
    <HomeLayout showBg={showBg}>
      <div className="mb-16 sm:mb-24">
        <Helmet>
          <title>{t("global.name")}</title>
        </Helmet>
        {/* Removed HeroPart component */}
        <ThinContainer>
          <div className="mt-44 space-y-16 text-center">
            <div className="relative z-10 mb-16">
              <h1 className="text-4xl font-bold text-white">Explore</h1>
            </div>
          </div>
        </ThinContainer>
      </div>
      <WideContainer>
        <>
          <div className="flex items-center justify-center mt-6 mb-6">
            <button
              type="button"
              className="flex items-center space-x-2 rounded-full px-4 text-white py-2 bg-pill-background bg-opacity-50 hover:bg-pill-backgroundHover transition-[background,transform] duration-100 hover:scale-105"
              onClick={handleRandomMovieClick}
              style={{ minWidth: "200px" }} // Add a minimum width
            >
              <span className="flex items-center overflow-hidden flex-wrap-nowrap flex-row">
                {countdown !== null && countdown > 0 ? (
                  <div className="items-center inline-block overflow-hidden">
                    <span className="whitespace-nowrap overflow-ellipsis overflow-hidden">
                      Cancel Countdown ({countdown})
                    </span>
                    <Icon
                      icon={Icons.X}
                      className="text-2xl ml-[4.5px] mb-[-0.7px]"
                    />
                  </div>
                ) : (
                  <div className="flex items-center">
                    <span className="whitespace-nowrap overflow-ellipsis overflow-hidden">
                      Watch a Random Movie
                    </span>
                    <img
                      src="https://cdn-icons-png.flaticon.com/512/4058/4058790.png"
                      alt="Small Image"
                      style={{
                        width: "20px", // Adjust the width as needed
                        height: "20px", // Adjust the height as needed
                        marginLeft: "10px", // Add margin-left
                      }}
                    />
                  </div>
                )}
              </span>
            </button>
          </div>
          {randomMovie && (
            <div className="mt-4 mb-4 text-center">
              <p>Now Playing {randomMovie.title}</p>
              {/* You can add additional details or play functionality here */}
            </div>
          )}
          <div className="flex flex-col">
            {categories.map((category) => (
              <div
                key={category.name}
                id={`carousel-${category.name
                  .toLowerCase()
                  .replace(/ /g, "-")}`}
                className="mt-8"
              >
                {renderMovies(
                  categoryMovies[category.name] || [],
                  category.name,
                )}
              </div>
            ))}
            {genres.map((genre) => (
              <div
                key={genre.id}
                id={`carousel-${genre.name.toLowerCase().replace(/ /g, "-")}`}
                className="mt-8"
              >
                {renderMovies(genreMovies[genre.id] || [], genre.name)}
              </div>
            ))}
            {tvGenres.map((genre) => (
              <div
                key={genre.id}
                id={`carousel-${genre.name.toLowerCase().replace(/ /g, "-")}`}
                className="mt-8"
              >
                {renderMovies(tvShowGenres[genre.id] || [], genre.name, true)}
              </div>
            ))}
          </div>
        </>
      </WideContainer>
    </HomeLayout>
  );
}
