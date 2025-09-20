# Weedbreed.AI — UI Elements
If Icons are used the Google Material Icon name is shown in brackets like `... icon (search) ...`

## 1. Start Screen
This is the first screen a new user sees. It is a simple, centered layout.
__Title__: A large, prominent title reading "Weedbreed.AI - Reboot".
__Subtitle__: A smaller line of text below the title: "Your AI-powered cannabis cultivation simulator."
__Action Buttons__: A row of three distinct buttons:
- A primary "New Game" button.
- A secondary "Load Game" button.
- A tertiary "Import Game" button.

## 2. Main Game Interface
Once a game is started or loaded, the main interface appears. It consists of a persistent header (the Dashboard) and a main content area that changes based on user navigation.
### 2.1. The Dashboard (Persistent Header)
This bar is always visible at the top of the screen during gameplay.

*Left Side - Key Metrics:*
__Capital__: Displays the player's current money in a standard currency format (e.g., "$1,000,000.00").
__Cumulative Yield__: Shows the total weight of all harvested product in grams (e.g., "542.10g").
__Game Time__: A dynamic display showing the in-game date and time (e.g., "Y1, D32, 14:00"). It is accompanied by a progress circle that fills up over one in-game hour, providing a visual cue for the passage of time.

*Right Side - Controls & Navigation:*
__Simulation Control:__
- A circular Play/Pause button. It shows a "play" icon (play_circle) when the game is paused and a "pause" icon (pause_circle) when it's running.
- A Game Speed control panel with buttons for "0.5x", "1x", "10x", "25x", "50x", and "100x" speeds. The currently selected speed is highlighted.
- __View Navigation__:
   - A circular button with a graph icon (monitoring) to switch to the Finances view.
   - A circular button with a people icon (groups) to switch to the Personnel view.
Menus & Alerts:
   - A circular button with a notification bell icon (notifications) for Alerts. A small red circle with a number appears on it if there are unread alerts.
   - A circular button with a settings cog icon (settings) for the Game Menu.

### 2.2. Navigation Bar (Breadcrumbs)
This bar appears below the Dashboard whenever the player navigates deeper than the main structure list.
It shows a clickable path of the player's current location, for example: Structures / Small Warehouse #1 / Grow Room 1.
A back-arrow button (←) is present to go up one level in the hierarchy.
## 3. Main Content Views
This is the largest part of the screen, displaying the core game information.
### 3.1. Structures List (Default View)
__Header__: A title reading "Your Structures" and a button to "+ Rent Structure".
__Content__: A grid of cards, where each card represents a building the player has rented. Each card displays:
- The structure's name.
- Its total area in square meters.
- The number of rooms inside.
- A summary of plants (e.g., "Plants: 50/100 (Flowering - 75%)").
The total expected yield from all plants inside.
### 3.2. Structure Detail View
__Header__: The name of the structure, followed by icons to Rename (edit) and Delete (delete). It also shows the used vs. available area and a button to "+ Add Room".
__Content__: A grid of cards, where each card represents a room within the structure.    Each card displays:
- The room's name, with icons to Rename (edit), Duplicate (content_copy), and Delete (delete).
- Its area, purpose (e.g., "Grow Room"), and number of zones.
- A plant and yield summary if applicable.
### 3.3. Room Detail View
__Header__: The room's name and its purpose shown as a badge (e.g., [LABORATORY]), with icons to Rename (edit) and Delete (delete). It also shows the used vs. available area.
__Content__:
- For Grow Rooms: A "Zones" sub-header and a button to "+ Add Zone". Below is a grid of cards, one for each cultivation zone. Each card shows the zone's name, area, cultivation method, and a plant/yield summary.
- For Laboratories: A "Breeding Station" sub-header and a button to "+ Breed New Strain". Below is a grid of cards, each representing a custom-bred strain with its key genetic traits.
### 3.4. Zone Detail View
This is the most detailed management screen, laid out in two columns.
__Header__: The zone's name, flanked by left and right arrow icons (arrow_back_ios, arrow_forward_ios) to cycle through other zones in the same room. It has icons to Rename (edit) and Delete (delete).

*Left Column (Information Panels):*
__General Info__: A card showing the zone's area, cultivation method, and plant count vs. capacity.
__Supplies__: A card showing current Water and Nutrients levels, daily consumption rates, and buttons to add more of each.
__Lighting__: A card displaying the light cycle (e.g., "18h / 6h"), lighting coverage, average light intensity (PPFD), and total daily light (DLI).
Environment & Climate: A card showing the current Temperature, Relative Humidity, and CO₂ levels, along with sufficiency ratings for Airflow, Dehumidification, and CO₂ injection.

*Right Column (Management Panels):*
__Plantings__: A list of all plant groups in the zone. Each group is expandable to show individual plants with their health and progress. It has a button to "+ Plant Strain" and another to "Harvest All" (content_cut).
__Planting Plan__: A panel to configure automation. It shows the planned strain and quantity for auto-replanting, an "Auto-Replant" toggle switch, and buttons to Edit (edit) or Delete (delete) the plan.
__Devices__: A list of all installed device groups. Each group has a status light (on/off/broken), its name, and a count. Groups are expandable to show individual devices. It has buttons to adjust group settings (tune), edit the light cycle (schedule), and a main button to "+ Device".
### 3.5. Finances View
__Header__: "Financial Summary".
__Content__: A series of panels with tables and summary cards:
__Summary Cards__: Large displays for Net Profit/Loss, Total Revenue, Harvest Revenue, Cumulative Yield, and Total Expenses.
__Breakdown Tables__: Detailed tables for Revenue and Expenses, showing the total and average-per-day amount for each category (e.g., Rent, Salaries, Harvests).
### 3.6. Personnel View
__Tabs__: Two main tabs: "Your Staff" and "Job Market".

*Your Staff Tab:*
Displays all hired employees as cards, grouped by the structure they work in.
Each employee card shows their name, salary, a dropdown to set their role, status bars for Energy and Morale, their current task, a list of skills with progress bars, and their personality traits. An icon is available to Fire (person_remove) them.
A "Company Policies" section provides a toggle switch to set the company's overtime policy (Payout vs. Time Off).

*Job Market Tab:*
A dropdown menu to filter available candidates by role.
A grid of candidate cards, identical in layout to the employee cards but with a "Hire" button at the bottom.
## 4. Modals (Pop-ups)
*Important rule for modals:* If a modal is shown the simulation must be paused. After the modal is closed the simulation must be resumed (if the simulation ran before modal activation).

Modals appear as overlays on top of the main interface for specific actions.
Creation Modals (Rent, Add Room/Zone, Install Device, etc.): These present forms with input fields, dropdowns, and sliders to configure the new item, often showing a cost and a confirmation button.

Management Modals (Rename, Delete, Edit Settings): These are simpler forms for changing a name, confirming a deletion, or adjusting settings like target temperature with a slider.

Game Lifecycle Modals (Save, Load, Reset): These provide an input to name a save file, a list of existing saves to load or delete, or a final confirmation to reset the game.

HR Modals (Hire, Negotiate Salary): The hire modal asks where to assign the employee. The salary negotiation modal presents the employee's request and gives the player options to accept, decline, or offer a one-time bonus.