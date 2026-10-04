"use client";

import { useRouter } from "next/navigation";

const rules = [
  <>結婚式の受付時に回していただいた<strong>アクキー</strong>をご確認ください。</>,
  <>画面上で<strong>ルーレット</strong>を回します。</>,
  <>ルーレットで<strong>当たりのアクキー</strong>が表示されます。</>,
  <>お手元のアクキーと<strong>同じ絵柄が出たら当たり</strong>です。</>,
  <>当たった方には<strong>景品</strong>があります。</>,
  <>当選者は<strong>3名</strong>です。</>
];

export function HowToPlayScreen() {
  const router = useRouter();

  return (
    <main className="how-to-play">
      <header className="how-to-play__logo">
        <img alt="WEDDING AKKEY-ROULETTE" src="/media/akkey-roulette-title.png" />
      </header>

      <section className="how-to-play__console" aria-label="遊び方と景品">
        <section className="how-to-play__rules-panel">
          <span aria-hidden="true" className="how-to-play__screw how-to-play__screw--tl" />
          <span aria-hidden="true" className="how-to-play__screw how-to-play__screw--tr" />
          <span aria-hidden="true" className="how-to-play__screw how-to-play__screw--bl" />
          <span aria-hidden="true" className="how-to-play__screw how-to-play__screw--br" />

          <div className="how-to-play__screen">
            <span aria-hidden="true" className="how-to-play__corner how-to-play__corner--tl" />
            <span aria-hidden="true" className="how-to-play__corner how-to-play__corner--tr" />
            <span aria-hidden="true" className="how-to-play__corner how-to-play__corner--bl" />
            <span aria-hidden="true" className="how-to-play__corner how-to-play__corner--br" />
            <h1>HOW TO PLAY</h1>
            <p className="how-to-play__subtitle">— 遊び方 —</p>
            <ol>
              {rules.map((rule, index) => (
                <li key={index}>
                  <span aria-hidden="true">{index + 1}</span>
                  <p>{rule}</p>
                </li>
              ))}
            </ol>
          </div>

          <button className="how-to-play__start" onClick={() => router.push("/roulette/play")} type="button">
            <i aria-hidden="true">▶</i> ROULETTE START
          </button>
        </section>

        <aside className="how-to-play__prizes" aria-labelledby="prize-title">
          <h2 id="prize-title">PRIZE</h2>
          <p>— 景品 —</p>
          <ol>
            {["1人目", "2人目", "3人目"].map((label) => (
              <li key={label}>
                <div><strong>{label}</strong><b>???</b></div>
                <span aria-label={`${label}の景品は後日公開`}>?</span>
              </li>
            ))}
          </ol>
        </aside>
      </section>
    </main>
  );
}
