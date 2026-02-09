# 📘 Project: Just One Tap (J_O_T)

> **"Don't Think. Just Tap."**
> The simplest routine to build wealth.
>
> **Identity:** Nintendo's Kindness + Duolingo's Obsession

---

## 1. 🎯 프로젝트 개요 (Overview)

### 1.1. Core Concept
* **Problem:** 사람들은 저축을 원하지만(System 2), 과정이 복잡하고 귀찮다(System 1).
* **Solution:** 모든 과정을 **"One Tap"**으로 압축하여 뇌의 저항값을 0으로 만든다.
* **Goal:** "Ready? Just One Tap." → 광고 시청 → 보상. 이 30초 루틴을 전 세계인의 습관으로 만든다.

### 1.2. Target Audience (Global First)
* **Strategy:** 언어 장벽이 없는 직관적인 UI로 글로벌 시장(Tier 1: US/EU) 우선 공략.
* **Mass:** 남녀노소 누구나. "심심할 때 누르는" 피젯 토이(Fidget Toy) 감성.

### 1.3. Business Model (BM)
* **Ad-Driven:** 루틴 수행의 대가는 '돈'이 아니라 '시간(광고 시청)'이다.
* **No IAP:** 인앱 결제 없음. 오직 꾸준함으로만 승부.

---

## 2. 🎨 UX/UI Design & Assets

### 2.1. Design Philosophy: "Nintendo White"
* **Atmosphere:** Clean, Kind, Playful. (닌텐도 Wii 스타일).
* **Color:** Pure White 배경 + Vivid Point Colors (Blue, Red, Yellow).
* **Language:** English (Default). 텍스트를 최소화하고 아이콘(픽토그램) 위주로 소통.

### 2.2. Asset References
* **Icons (Vector/SVG):** Figma "Cute Isometric Icons Pack".
* **Components:** Figma "Mobile Apps Prototyping Kit".

---

## 3. 🔄 User Flow (The Routine)

### 3.1. Onboarding (First Time Experience)
> 닌텐도 게임을 켤 때의 설렘과 정중함을 영어로 전달.

* **Intro:**
    * **Logo:** J_O_T Studio (Fade In/Out).
    * **Message:** 검은 화면에 흰 글씨 (타이핑 효과).
    * **Copy:** "Ready? Just One Tap."
* **User Info:**
    * Age / Gender (Simple Selection).
* **Goal Setting (Core):** "How much can you save daily?"
    * **Input:** 텍스트 입력 없음. **Slider** 조작.
    * **Feedback:** 슬라이더 값에 따라 아이콘 변경 (☕ Coffee -> 🍔 Burger -> 🍗 Chicken).
    * **Localization:** 화폐 단위는 접속 국가(IP)에 따라 자동 변경 ($/₩/€).

### 3.2. Main Screen (Home)
> 군더더기 없는 심플함.

* **Top Bar:**
    * 🏳️ **Flag:** User Country (SVG).
    * 🔥 **Streak:** Consecutive Days (Gray -> Fire Color).
    * 💎 **Points:** Current Points (Not Cash).
* **Center:**
    * **The Button:** 화면 중앙의 거대한 물리적 버튼.
    * **State:**
        * Active: "Tap to Save"
        * Inactive: "See you tomorrow"
* **Bottom Bar:**
    * 🏆 Ranking
    * 🏠 Home
    * 👤 Profile

### 3.3. Action Loop
1.  **Tap:** 버튼 클릭 (Heavy Click Sound & Haptic).
2.  **Ad:** 전면 광고(Interstitial, 15s) 재생.
3.  **Reward:**
    * "Saved!" (English) + Confetti Effect.
    * Points Up + Streak Fire Animation.
    * **Feedback:** "28 taps left to Chicken!"

---

## 4. 🏆 Gamification Systems

### 4.1. Ranking (Global Leaderboard)
* **Tab 1: Collect (Reliability)**
    * "Who is the most consistent?" (Streak/Total Clicks).
* **Tab 2: Buy (Flex)**
    * "Who spent the most points?" (Consumption).
* **Tiers:** Bronze 🥉 -> Silver 🥈 -> Gold 🥇 -> Diamond 💎.

### 4.2. Progression (Milestone)
> 돈이 아닌 '물건'으로 성취감 부여.

* **10 Taps:** 🍟 French Fries.
* **20 Taps:** 🍔 Burger.
* **30 Taps:** 🍗 Chicken Bucket.

### 4.3. Profile & Settings
* **Profile:** Nickname, Avatar, Streak Calendar.
* **Settings:**
    * **Language:** English (Default) / Korean / Japanese / Spanish...
    * **Notifications:** "Push Alerts" (On/Off).
        * *Copy:* "Your streak is about to break!", "Just one tap needed."
    * **Sound/Haptic:** On/Off.
    * **Account:** Google/Apple Sign-in.
    * **Reset:** Reset Data / Delete Account.

---

## 5. 🛠️ Tech Stack Strategy

* **Localization:** I2 Localization 또는 Unity Localization 패키지 사용 (확장성 고려).
* **Assets:** Vector Graphics (SVG) 필수.
* **Backend:** Firebase (Auth, Firestore).