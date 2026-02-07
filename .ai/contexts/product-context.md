# Reachout Product Context

## Overview
Reachout is a networking and informational interview tracker designed for job seekers. It provides a streamlined way to manage professional networking activities.

## User Journey

### 1. Add Contacts
Users start by adding contacts they want to reach out to. Each contact includes:
- Basic info (name, email, company, title)
- Connection type (alumni, referral, cold, etc.)
- Relationship strength (1-5)
- LinkedIn profile link
- Notes

### 2. Log Outreach
When reaching out, users log the communication:
- Type: initial, follow-up, or thank you
- Channel: email, LinkedIn, phone, other
- Track whether a response was received

### 3. Schedule Interviews
When a contact agrees to an informational interview:
- Create interview record linked to contact
- Set status (requested → scheduled → completed)
- Choose location type (virtual, phone, coffee, etc.)

### 4. Prepare for Interviews
Before each interview, users can add prep notes:
- Questions to ask
- Research about the person/company
- After the interview: insights gained

### 5. Track Progress
The dashboard shows:
- Kanban pipeline of interview statuses
- Total contacts and response rate
- Charts of contact types and outreach channels
- Number of insights captured

## Key Metrics
- **Total Contacts**: How many people in the network
- **Response Rate**: % of initial outreach that gets a reply
- **Interviews Completed**: Monthly count
- **Insights Captured**: Learnings from conversations

## Design Philosophy
1. **Simple over feature-rich** - Focus on core workflow
2. **Fast to use** - Keyboard shortcuts, minimal clicks
3. **Local-first** - No account required, data stays on device
4. **Zero dependencies for users** - Just npm install and go

## Technical Context
See `.ai/contexts/reachout.md` for technical details.
