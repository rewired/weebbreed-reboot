# Game Balance Constants

## Human Resources & Employee Morale

`SEVERANCE_PAY_DAYS = 7`
The number of days' salary paid as severance when an employee is fired.

`FIRE_MORALE_DROP = 10`
The morale penalty applied to all other staff in the same building when an employee is fired.

`RAISE_ACCEPT_MORALE_GAIN = 25`
The morale boost an employee receives when their salary raise request is approved.

`BONUS_OFFER_MORALE_GAIN = 15`
The morale boost from receiving a one-time bonus instead of a permanent raise.

`RAISE_DECLINE_MORALE_DROP = 20`
The morale penalty an employee suffers when their raise request is denied.

`CYCLE_COMPLETION_MORALE_GAIN = 2`
A small morale boost an employee gets after successfully completing a full work-rest cycle.

`TICKS_BETWEEN_RAISE_REQUESTS = 8760` (calculated from 365 \* 24)
The minimum in-game time (in hours) before an employee is eligible to ask for another raise.

`LOW_MORALE_QUIT_CHANCE_PER_DAY = 0.05` (or 5%)
The daily probability that an employee with very low morale will quit their job.
Employee Energy

`ENERGY_COST_PER_TICK_WORKING = 10.0`
The amount of energy an employee loses for every hour they are working on a task.

`ENERGY_REGEN_PER_TICK_RESTING = 10.0`
The amount of energy an employee recovers for every hour spent resting in a breakroom.

`IDLE_ENERGY_REGEN_PER_TICK = 2.5`

The small amount of energy an employee recovers for every hour they are idle but not in a designated breakroom.

`ENERGY_REST_THRESHOLD = 20`
If an employee's energy falls below this level, they will stop working and prioritize finding a breakroom to rest.

`OFF_DUTY_DURATION_TICKS = 16`
The number of hours an employee is unavailable for work after their energy is completely depleted, allowing them to fully recover.

## Skills & Experience

`XP_PER_LEVEL = 100`
The amount of experience points needed to increase a skill by one full level.

`TASK_XP_REWARD = 10`
The amount of experience an employee gains in the relevant skill after successfully completing a task.

`DAILY_ROLE_XP_GAIN = 2`
A small amount of "passive" experience an employee gains each day in the primary skill associated with their assigned job role.

## Plant Growth & Health

`PLANT_STRESS_IMPACT_FACTOR = 0.05`
A multiplier that determines how much a plant's health is damaged each hour based on its current stress level.

`PLANT_RECOVERY_FACTOR = 0.003`
A multiplier that determines how quickly a plant's health regenerates each hour when its environmental conditions are ideal.

`PLANT_DISEASE_IMPACT = 0.1`
The amount of health a plant immediately loses when it is afflicted with a new disease.

`PLANT_BASE_GROWTH_PER_TICK = 0.05`
The base amount of biomass (in grams) a perfectly healthy and unstressed plant will gain each hour under light.

`PLANT_SEEDLING_DAYS = 3`
The number of in-game days a plant will remain in the seedling stage before progressing.

`PLANT_STAGE_TRANSITION_PROB_PER_DAY = 0.25` (or 25%)
After a plant has spent the minimum required time in its current growth stage, this is the daily chance it will transition to the next stage.

## General Time

`TICKS_PER_MONTH = 30`
The number of in-game hours that are considered one "month" for calculating recurring costs like rent.
