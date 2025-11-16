import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import ExcelJS from "exceljs";

const app = express();
const PORT = process.env.PORT || 3000;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

async function fetchASINs(sellerId) {
  const asins = new Set();

  for (let char of "abcdefghijklmnopqrstuvwxyz") {
    let page = 1;

    while (true) {
      const url = `https://www.amazon.co.uk/s?i=aps&me=${sellerId}&k=${char}&page=${page}`;

      try {
        const { data } = await axios.get(url, {
          headers: { "User-Agent": USER_AGENT },
        });

        const $ = cheerio.load(data);
        const items = $("[data-asin]")
          .map((i, el) => $(el).attr("data-asin"))
          .get()
          .filter((x) => x && x.length === 10);

        if (items.length === 0) break;

        items.forEach((asin) => asins.add(asin));
        page++;
      } catch (e) {
        break;
      }
    }
  }

  return [...asins];
}

app.get("/get", async (req, res) => {
  const sellerId = req.query.seller;
  if (!sellerId) return res.status(400).send("seller parametresi gerekli");

  const asinList = await fetchASINs(sellerId);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("ASIN Listesi");

  sheet.columns = [{ header: "ASIN", key: "asin", width: 15 }];
  asinList.forEach((a) => sheet.addRow({ asin: a }));

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=${sellerId}_asins.xlsx`
  );

  await workbook.xlsx.write(res);
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
