import { ALMARKET_LOGO, AZERSUN_LOGO } from '../constants/logos';

export type ActPrintData = {
  sourceLocation: string; // KAYITLI OLDUGU YER
  fromLocation: string; // KULLANILACAK YER
  date: string; // 25.10.2026
  description: string; // KART (qeyd)
  fromUser: string; // Teslim Eden
  toUser: string; // Teslim alanin
  items: { barcode: string; name: string; count: string }[];
};

const esc = (s: string) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function buildActHtml(d: ActPrintData): string {
  const rows = Array.from({ length: 43 }, (_, i) => {
    const it = d.items[i];
    return `<tr class="r">
      <td class="c">${i + 1}</td>
      <td>${it ? esc(d.description) : ''}</td>
      <td>${it ? esc(it.barcode) : ''}</td>
      <td colspan="5">${it ? esc(it.name) : ''}</td>
      <td class="c">${it ? esc(it.count) : ''}</td>
      <td></td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=794, user-scalable=yes" />
<style>
  /* A4 = 794px eni. Yuxari 2sm(76px), yanlardan 3sm(113px), asagidan 5sm */
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 76px 0 0 0; background: #fff; color: #000; font-family: Arial, Helvetica, sans-serif; }
  .sheet { width: 567px; margin: 0 auto; border: 1px solid #000; padding: 3px; }
  /* Loqolar 2sm x 2sm (76px), konclerden 6px mesafe */
  .head { display: flex; align-items: center; justify-content: space-between; padding: 6px; }
  .head .hl, .head .hr { width: 76px; height: 76px; flex: none; }
  .head img { width: 76px; height: 76px; object-fit: contain; display: block; }
  .head .hc { flex: 1; text-align: center; font-weight: bold; }
  .t1 { font-size: 11.5px; }
  .t2 { font-size: 10px; margin-top: 2px; }
  .t3 { font-size: 10px; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 7.5px; }
  td { border: 1px solid #000; padding: 1px 3px; overflow: hidden; word-wrap: break-word; }
  .c { text-align: center; }
  .b { font-weight: bold; }
  /* Daxil olunan yazilar: 11px */
  .r td { height: 13px; font-size: 11px; line-height: 11px; padding: 0 2px; white-space: nowrap; text-overflow: ellipsis; }
  .top td.v { font-size: 11px; }
  .decl { height: 36px; line-height: 1.3; padding: 3px 5px; }
  /* Imza cedveli: ayrica sutunlar, yuxaridaki cedvele -1px yapisir (cift xett olmasin) */
  .sigt { margin-top: -1px; }
  .nm td { height: 16px; font-size: 11px; line-height: 12px; vertical-align: top; text-align: center; border-bottom: 0; padding-top: 2px; }
  .sg td { height: 56px; border-top: 0; }
</style>
</head>
<body>
<div class="sheet">
  <div class="head">
    <div class="hl"><img src="${AZERSUN_LOGO}" /></div>
    <div class="hc">
      <div class="t1">AZERSUN HOLDING ŞİRKETLER GRUBU</div>
      <div class="t2">SABİT KIYMET</div>
      <div class="t3">TEHVIL-TESLIM KULLANIM FORMU</div>
    </div>
    <div class="hr"><img src="${ALMARKET_LOGO}" /></div>
  </div>

  <table class="top">
    <colgroup>
      <col style="width:3.2%"><col style="width:16%"><col style="width:15.2%"><col style="width:9.8%">
      <col style="width:9%"><col style="width:9%"><col style="width:9%"><col style="width:8.3%">
      <col style="width:10.9%"><col style="width:9.6%">
    </colgroup>
    <tr>
      <td colspan="2" class="b">SIRKET:</td>
      <td colspan="2" class="v">ALMARKET</td>
      <td colspan="4" rowspan="3" class="c b" style="font-size:14px;vertical-align:middle;">AL MARKET</td>
      <td colspan="2" class="c b">TARIH</td>
    </tr>
    <tr>
      <td colspan="2" class="b">KAYITLI OLDUGU YER</td>
      <td colspan="2" class="v">${esc(d.sourceLocation)}</td>
      <td colspan="2" rowspan="2" class="c v" style="vertical-align:middle;">${esc(d.date)}</td>
    </tr>
    <tr>
      <td colspan="2" class="b">KULLANILACAK YER</td>
      <td colspan="2" class="v">${esc(d.fromLocation)}</td>
    </tr>
    <tr class="c b">
      <td>No</td><td>KART</td><td>BARKOD</td><td colspan="5">DURAN VARLIQ TANIMI</td><td>MIQDAR</td><td>MASRAF</td>
    </tr>
    ${rows}
    <tr>
      <td colspan="10" class="decl">Azersun Holding Sirketler Grubuna yukarida barkod numaralari belirtilmis Sabit qiymet terefiden teslim alinmisdir.Zimmetime aldigim bu sabit qiymetlerin Sabit qiymet yonetmenliyi hukumleri dahilinde kullanimindan bakimindan ve korunmasindan sorumlu oldugum ucun imzam ile beyan ve taahut ederim taahhut ederim</td>
    </tr>
  </table>

  <table class="sigt">
    <colgroup>
      <col style="width:29%"><col style="width:29%"><col style="width:16%"><col style="width:26%">
    </colgroup>
    <tr class="c b">
      <td>Teslim Eden</td><td>Teslim alanin</td><td>Sorumlu shexsin</td><td>Al market Sabit Qiymet Sorumlusu</td>
    </tr>
    <tr class="c">
      <td>ad soyad imza</td><td>adi soyadi imza</td><td>ad soyad imza</td><td></td>
    </tr>
    <tr class="nm">
      <td>${esc(d.fromUser)}</td>
      <td>${esc(d.toUser)}</td>
      <td></td><td></td>
    </tr>
    <tr class="sg">
      <td></td><td></td><td></td><td></td>
    </tr>
  </table>
</div>
</body>
</html>`;
}