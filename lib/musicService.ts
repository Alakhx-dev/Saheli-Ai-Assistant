export interface JioSaavnSong {
  id: string;
  title: string;
  artist: string;
  album: string;
  image: string;
  encryptedMediaUrl: string;
}

/**
 * Searches songs on JioSaavn via RapidAPI.
 * Attempts specific song search first, then global search.
 */
export async function searchSongs(query: string, apiKey: string): Promise<JioSaavnSong[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Referer": "https://www.jiosaavn.com/",
  };

  // We fetch directly from the public JioSaavn API to avoid 404 search errors on JioSaavn unofficial RapidAPI
  const url = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&cc=in&includeMetaTags=1&q=${encodeURIComponent(cleanQuery)}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`JioSaavn Search failed with status ${response.status}`);
    }

    const resData: any = await response.json();
    
    // Parse the results from different possible response formats
    let rawSongs = resData?.results || resData?.data?.results || resData?.data || (Array.isArray(resData) ? resData : []);

    // Fallback to autocomplete search to correct spelling if no direct results were found
    if (rawSongs.length === 0) {
      const autocompleteUrl = `https://www.jiosaavn.com/api.php?__call=autocomplete.get&_format=json&_marker=0&cc=in&includeMetaTags=1&query=${encodeURIComponent(cleanQuery)}`;
      try {
        const autoResponse = await fetch(autocompleteUrl, { headers });
        if (autoResponse.ok) {
          const autoData = await autoResponse.json();
          const firstSongTitle = autoData?.songs?.data?.[0]?.title || autoData?.songs?.[0]?.title;
          if (firstSongTitle) {
            console.log(`🔍 [musicService] Auto-corrected spelling fallback: "${cleanQuery}" -> "${firstSongTitle}"`);
            // Query search API again with corrected spelling
            const retryUrl = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&cc=in&includeMetaTags=1&q=${encodeURIComponent(firstSongTitle)}`;
            const retryResponse = await fetch(retryUrl, { headers });
            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              const retrySongs = retryData?.results || retryData?.data?.results || retryData?.data || [];
              if (Array.isArray(retrySongs) && retrySongs.length > 0) {
                rawSongs = retrySongs;
              }
            }
          }
        }
      } catch (err) {
        console.error("Autocomplete spelling correction failed:", err);
      }
    }
    
    return rawSongs.map((song: any): JioSaavnSong => {
      // Parse artist names
      let artistName = "Unknown Artist";
      if (song.primary_artists) {
        artistName = song.primary_artists;
      } else if (song.primaryArtists) {
        artistName = song.primaryArtists;
      } else if (song.artists?.primary && Array.isArray(song.artists.primary) && song.artists.primary.length > 0) {
        artistName = song.artists.primary.map((a: any) => a.name).join(", ");
      } else if (song.singers) {
        artistName = song.singers;
      } else if (song.artist) {
        artistName = typeof song.artist === "string" ? song.artist : (song.artist.name || "Unknown Artist");
      }

      // Parse album names
      let albumName = "Single";
      if (song.album && typeof song.album === "object") {
        albumName = song.album.name || "Unknown Album";
      } else if (song.album) {
        albumName = song.album;
      } else if (song.albumName) {
        albumName = song.albumName;
      }

      // Parse image URL (usually high-quality is the last link in array or direct link)
      let imageUrl = "";
      if (Array.isArray(song.image) && song.image.length > 0) {
        // Look for 500x500 or just take the last element (highest quality)
        const highQuality = song.image.find((img: any) => img.quality === "500x500") || song.image[song.image.length - 1];
        imageUrl = highQuality?.link || highQuality?.url || song.image[0];
      } else if (song.image) {
        imageUrl = song.image;
      } else if (song.albumArt) {
        imageUrl = song.albumArt;
      }

      // Improve image quality to 500x500 if it's a string URL
      if (typeof imageUrl === "string" && imageUrl) {
        imageUrl = imageUrl.replace("150x150", "500x500").replace("50x50", "500x500");
      }

      // Parse encrypted media URL
      const encryptedMediaUrl = song.encrypted_media_url || song.encryptedMediaUrl || "";

      return {
        id: String(song.id || Math.random().toString(36).substring(2, 9)),
        title: String(song.song || song.name || song.title || "Unknown Song"),
        artist: artistName,
        album: albumName,
        image: imageUrl || "/placeholder-album.png",
        encryptedMediaUrl,
      };
    }).filter((song: JioSaavnSong) => song.encryptedMediaUrl); // only return songs that have play url
  } catch (error) {
    console.error("Error searching songs in JioSaavn:", error);
    throw error;
  }
}

/**
 * Resolves an encrypted media URL to a playable audio stream URL.
 */
export async function resolveSongUrl(encryptedMediaUrl: string, apiKey: string): Promise<string> {
  // We no longer strictly enforce apiKey here since we use the official API directly
  if (!encryptedMediaUrl) {
    throw new Error("Missing encrypted media URL");
  }

  const url = `https://www.jiosaavn.com/api.php?__call=song.generateAuthToken&url=${encodeURIComponent(encryptedMediaUrl)}&bitrate=160&api_version=4&_format=json&ctx=web6dot0&_marker=0`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://www.jiosaavn.com/",
      },
    });

    if (!response.ok) {
      throw new Error(`JioSaavn generateAuthToken failed with status ${response.status}`);
    }

    const data: any = await response.json();
    
    // Extract stream url from the response
    const playableUrl = data?.auth_url;
    
    if (!playableUrl) {
      throw new Error("Playable media URL could not be resolved from response");
    }

    return playableUrl;
  } catch (error) {
    console.error("Error resolving JioSaavn song URL:", error);
    throw error;
  }
}
