const data = {
  "Candles": [
    { name: "Sculpture Candle", img: "Sculpture Candle 2 (2).jpg"},
    { name: "Donut Candle", img: "Donut candle 6.jpg"},
    { name: "Cinnamon Candle", img: "Cinamon candle 4.jpg"},
    { name: "Flower Candle", img: "Flower candle 2.jpg"},
    { name: "Matcha Candle", img: "Matcha candle 1.jpg"},
    { name: "Snowflake Candle", img: "Snowflake candle 1.jpg"}
  ],

  "Handmade Keychains": [
    { name: "Transparent Blue Heart", img: "Transparent blue heart 1.jpg" },
    { name: "Purple Angel", img: "Purple angel keychain 1.jpg" },
    { name: "Sunset Flower", img: "Sunset flower keychain 2.jpg" },
    { name: "Green Flower", img: "Green flower keychain 1.jpg" },
    { name: "Evil Eye", img: "Evil eye 4.jpg" },
    { name: "Pink Aroma", img: "Pink aroma keychain 2.jpg" },
    { name: "Green Leaf", img: "Green leaf 4.jpg" },
    { name: "Pink Rib", img: "Pink rib 6.jpg" },
    { name: "Clean Keychain", img: "Clean keychain 1.jpg" }
  ],

  "Paintings": [
    { name: "Tiny Flower 3D", img: "tiny_flowed_3d_5.jpg" },
    { name: "Calla Lilies", img: "Calla lilies_2.jpg" },
    { name: "Blue Sunset 3D", img: "blue_sunset_3d_1.jpg" },
    { name: "Painting Portrait 1", img: "painting_portrait_1.jpg" },
    { name: "Painting Portrait 2", img: "painting_portrait_2.jpg" },
    { name: "Painting Portrait 3", img: "painting_portrait_3.jpg" },
    { name: "Painting Portrait 4", img: "painting_portrait_4.jpg" }
  ],

  "Hair Accessories": [
    { name: "Uni Hairpin", img: "Uni hairpin 2.jpg" },
    { name: "Rainbow Hairpin", img: "Rainbow hairpin 2.jpg" },
    { name: "Blue Flower Hairpin", img: "Blue flower hairpin 8.jpg" },
    { name: "Red Flower Hairpin", img: "Red flower hairpin 2.jpg" },
    { name: "Pink Flower Hairpin", img: "Pink flower hairpin 12.jpg" },
    { name: "Purple Hairpin", img: "Purple hairpin 1.jpg" }
  ],

  "Knitted Items": [
    { name: "Knitted Purple Gnome", img: "knitted_purple_gnome.jpg" },
    { name: "Knitted Santa", img: "knitted_santa_1.jpg" },
    { name: "Knitted Green Dino", img: "knitted_green_dino.jpg" }
  ]
};

function renderCatalogue() {
  const container = document.getElementById("catalogue");
  container.innerHTML = "";

  for (const category in data) {
    const section = document.createElement("div");
    section.className = "category";

    const title = document.createElement("h2");
    title.textContent = category;
    section.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "grid";

    data[category].forEach(item => {
      const card = document.createElement("div");
      card.className = "item";

      const img = document.createElement("img");
      img.src = item.img;
      img.onerror = () => {
        img.src = "default.jpg";
      };

      const name = document.createElement("h3");
      name.textContent = item.name;

      card.appendChild(img);
      card.appendChild(name);
      grid.appendChild(card);
    });

    section.appendChild(grid);
    container.appendChild(section);
  }
}

renderCatalogue();
