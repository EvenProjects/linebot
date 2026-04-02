# Lumè System - Product Requirements Document (PRD)

## Project Overview

Lumè is a Discord utility and economy bot designed for server management, XP tracking, and user engagement. It features an aesthetic-first design and a robust security system.

## Command List & Descriptions

### General Commands
| Command | Alias | Description | Permission |
| :--- | :--- | :--- | :--- |
| `ping` | `بنج` | Check system latency and status. | Everyone |
| `rank` | `r`, `رتبة` | View your current XP, level, and global rank. | Everyone |
| `top` | `توب` | View the leaderboard (Hour/Day/Week/Month/Global). | Everyone |
| `profile` | `p`, `ب` | View your full user profile with asset info. | Everyone |
| `daily` | `d`, `يومي` | Claim your daily reward of Lumès. | Everyone |
| `c` | `bal` | Check balance or transfer Lumès to another user. | Everyone |
| `suggest` | `sug` | Submit a suggestion to the administration. | Everyone |
| `afk` | `afk` | Set your AFK status with a reason. | Everyone |
| `remind` | `تذكر` | Set a reminder in minutes. | Everyone |
| `snipe` | `sn` | Recover the last deleted message in the channel. | Everyone |
| `invite` | `inv` | Check who invited you or another user. | Everyone |

### Administrative Commands
| Command | Alias | Description | Permission |
| :--- | :--- | :--- | :--- |
| `clear` | `مسح` | Purge messages from the channel (1-2000). | Administrator |
| `ban` | `بان`, `برا` | Ban a user from the server. | Administrator |
| `kick` | `كيك`, `هش` | Kick a user from the server. | Administrator |
| `timeout` | `اص`, `تايم` | Timeout a user for a specific duration. | Administrator |
| `nickname` | `نك` | Change a user's nickname. | Administrator |
| `addrole` | `ار` | Assign a role to a user. | Administrator |
| `removerole` | `رر` | Remove a role from a user. | Administrator |
| `addl` | `addl` | Activate auto-line separator in a channel. | Administrator |
| `rml` | `rml` | Deactivate auto-line separator in a channel. | Administrator |
| `img` | `img` | Send an image to a specific room with an auto-line. | Administrator |
| `say` | `say` | Make the bot send a specific message. | Administrator |

### Owner Commands
| Command | Alias | Description | Permission |
| :--- | :--- | :--- | :--- |
| `up` | `up` | View detailed system diagnostics and host info. | Owner |
| `us` | `us` | Generate a global database asset report. | Owner |
| `status` | `st` | Manually update bot presence and activity. | Owner |
| `am` | `am` | Add Lumès to a user's balance. | Owner |
| `rm` | `rm` | Remove Lumès from a user's balance. | Owner |
| `gstart` | `gstart` | Initialize a giveaway with a specific prize. | Owner |
| `leaderboard` | `leaderboard` | Set the channel for real-time leaderboard stats. | Owner |
| `cro` | `cro` | Create a color reaction role message. | Owner |

## Security & Refinement Logic

- **Global Safe Execution**: All commands are wrapped in `try-catch` to prevent crashes.
- **Permission Mapping**: Stricter role/ID checks for sensitive administrative tasks.
- **Interaction Security**: Tickets and Giveaways use ID-locked button interactions.
- **Data Integrity**: JSON persistence logic ensures state is saved before any operation completes.

## Architectural Evolution
The bot has been restructured into a 5-file modular system for maintainability:
1. `index.js`: The central orchestrator (loads data, config, helper functions, and events).
2. `events.js`: Handles Discord event listeners (e.g. `guildMemberAdd`, `interactionCreate`).
3. `commands.js`: Handles general commands and XP tracking.
4. `commands_2.js`: Skeleton template linked and ready for additional commands.
5. `commands_3.js`: Skeleton template linked and ready for additional commands.
