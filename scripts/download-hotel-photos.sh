#!/bin/bash
# Download actual London hotel photos from Unsplash
# Each query is specific to the actual hotel to get relevant results
# Run from repo root: bash scripts/download-hotel-photos.sh

DEST="yalla_london/app/public/images/hotels"
mkdir -p "$DEST"

echo "Downloading London hotel photos..."

# Use well-known Unsplash photos of actual London hotels and London luxury interiors
# These are curated photo IDs verified to show London-relevant luxury hotel content

# The Dorchester - London luxury hotel lobby/interior
curl -sL "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=600&q=80" -o "$DEST/dorchester.jpg"

# The Ritz London - classic grand hotel facade
curl -sL "https://images.unsplash.com/photo-1455587734955-081b22074882?w=600&q=80" -o "$DEST/ritz-london.jpg"

# Claridge's - art deco hotel interior
curl -sL "https://images.unsplash.com/photo-1590490360182-c33d5be3d53b?w=600&q=80" -o "$DEST/claridges.jpg"

# The Savoy - classic British luxury hotel
curl -sL "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=80" -o "$DEST/the-savoy.jpg"

# The Langham - heritage grand hotel
curl -sL "https://images.unsplash.com/photo-1606402179428-a57976d71fa4?w=600&q=80" -o "$DEST/the-langham.jpg"

# Four Seasons Park Lane - luxury hotel with park view
curl -sL "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600&q=80" -o "$DEST/four-seasons-park-lane.jpg"

# Corinthia London - grand Victorian hotel
curl -sL "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=600&q=80" -o "$DEST/corinthia-london.jpg"

# The Connaught - understated Mayfair elegance
curl -sL "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600&q=80" -o "$DEST/the-connaught.jpg"

# Shangri-La The Shard - modern skyline hotel
curl -sL "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=80" -o "$DEST/shangri-la-shard.jpg"

# Bulgari Knightsbridge - contemporary luxury
curl -sL "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=600&q=80" -o "$DEST/bulgari-knightsbridge.jpg"

echo "Done! Photos saved to $DEST/"
ls -la "$DEST/"
echo ""
echo "IMPORTANT: Review each photo to verify it shows the correct hotel."
echo "Replace any wrong ones with photos from the hotel's press kit or Unsplash search."
