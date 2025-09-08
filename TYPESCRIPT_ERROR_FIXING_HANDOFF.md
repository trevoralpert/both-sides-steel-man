# TypeScript Error Fixing Progress & Handoff Guide

## 🎯 **CURRENT STATUS (Use this to prompt Cursor)**

**From 1,067 → 62 TypeScript errors (94.2% complete!)** 🎉

After cloning and setup, use this prompt with Cursor:

---

**CURSOR PROMPT:**
```
I'm continuing work on fixing TypeScript errors in this Both Sides app codebase. We've made incredible progress:

CURRENT STATUS:
- Started with: 1,067 TypeScript errors
- Current: ~62 TypeScript errors  
- Progress: 94.2% complete (1,005 errors eliminated!)

WHAT'S BEEN FIXED:
✅ Added @types/jest - eliminated 89 test errors
✅ Fixed useRef() calls with proper initial values - eliminated 6 errors
✅ Added missing type imports (SurveyQuestionType, SurveyQuestionCategory) - eliminated 3 errors  
✅ Fixed missing useState setters in visualization components - eliminated 13 errors
✅ Fixed actionTypes reference in toast component - eliminated 1 error

REMAINING ERROR CATEGORIES (~62 total):
1. Phase indexing (~6 errors) - COMPLETED phase missing from duration objects in usePhaseManagement.ts and useTurnManagement.ts
2. Toast component circular references (~13 errors) - in use-toast.tsx
3. Variable scoping (~8 errors) - variables used before declaration (especially isTyping in useMessageInput.ts)
4. Type assertions/mismatches (~15 errors) - various component prop type issues
5. useRef null assignments (~5 errors) - some refs trying to assign undefined to non-null types
6. Miscellaneous (~15 errors) - various small type fixes

IMMEDIATE NEXT STEPS:
Please run `yarn type-check` to see current errors, then systematically fix them starting with the phase indexing issues (quick wins). The patterns are all very fixable - we're in the final stretch!

Focus on one category at a time and update progress as you go. All the groundwork is done - this is just cleanup now.
```

---

## 🚀 **SETUP INSTRUCTIONS**

### 1. **Prerequisites**
```bash
# Ensure you have Node.js 18+ and Yarn
node --version  # Should be 18+
npm install -g yarn
yarn --version  # Should be 4.9.1+
```

### 2. **Clone & Navigate**
```bash
git clone <your-repository-url>
cd "Both Sides:Steel Man App/both-sides-app"
```

### 3. **Install Dependencies**
```bash
# This installs all packages including the ones we added during error fixing
yarn install
```

### 4. **Environment Setup**
```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local as needed (see ENVIRONMENT.md for details)
```

### 5. **Verify Setup & Check Current Status**
```bash
# Check TypeScript errors (should show ~62 errors)
yarn type-check

# Count exact number
yarn type-check 2>&1 | grep -c "error TS"

# Run other quality checks
yarn lint          # ESLint
yarn test          # Jest tests (should work now with @types/jest)
yarn dev           # Start development server
```

## 📊 **DETAILED PROGRESS RECORD**

### **Major Wins Achieved:**

**1. Jest Test Errors (89 errors eliminated)**
- **Issue**: Missing Jest type definitions
- **Solution**: `yarn add -D @types/jest`
- **Files affected**: All `*.test.tsx` files
- **Status**: ✅ COMPLETED

**2. Testing Library DOM Errors (15 errors eliminated)**  
- **Issue**: Missing DOM testing matchers
- **Solution**: `yarn add -D @testing-library/jest-dom` (already imported in jest.setup.js)
- **Files affected**: Test files using `toBeInTheDocument`, `toHaveClass`, etc.
- **Status**: ✅ COMPLETED

**3. useRef Initial Value Errors (6 errors eliminated)**
- **Issue**: `useRef<Type>()` calls without initial values
- **Solution**: Changed to `useRef<Type | null>(null)`
- **Files fixed**:
  - `src/lib/hooks/useMessageHistory.ts` - line 101
  - `src/lib/hooks/usePresence.ts` - lines 64, 65
  - `src/lib/hooks/useRealtimeConnection.ts` - lines 310, 311, 312
- **Status**: ✅ COMPLETED

**4. Missing Type Imports (3 errors eliminated)**
- **Issue**: `SurveyQuestionType` and `SurveyQuestionCategory` not imported
- **Solution**: Added imports to `src/lib/api/survey.ts`
- **Status**: ✅ COMPLETED

**5. Visualization Component State Issues (13 errors eliminated)**
- **Issue**: Components trying to use `setTimeRange`, `setShowDebates`, `setShowHeatMap` that didn't exist
- **Solution**: Added local state variables in:
  - `src/components/visualization/EngagementTimeline.tsx` - added `currentTimeRange`, `currentShowDebates`
  - `src/components/visualization/PlasticityMap.tsx` - added `currentShowHeatMap`
- **Status**: ✅ COMPLETED

**6. Toast ActionTypes Error (1 error eliminated)**
- **Issue**: Reference to `actionTypes` instead of `_actionTypes` 
- **Solution**: Fixed in `src/components/ui/use-toast.tsx` line 34
- **Status**: ✅ COMPLETED

### **Remaining Error Patterns (~62 errors):**

**1. Phase Duration Indexing (Priority: HIGH - Quick Wins)**
```typescript
// ERROR PATTERN:
DEFAULT_PHASE_DURATIONS[phase] // where phase can be 'COMPLETED'

// FILES AFFECTED:
- src/lib/hooks/usePhaseManagement.ts (lines ~66, 221, 301)  
- src/lib/hooks/useTurnManagement.ts (line ~95)

// SOLUTION NEEDED: 
Add COMPLETED: 0 to duration objects OR handle COMPLETED case explicitly
```

**2. Toast Component Circular References (Priority: MEDIUM)**
```typescript
// ERROR PATTERN:
Type alias 'ToasterToast' circularly references itself
Type alias 'Toast' circularly references itself

// FILE AFFECTED:
- src/components/ui/use-toast.tsx (multiple type definition issues)

// SOLUTION NEEDED:
Restructure type definitions to remove circular dependencies
```

**3. Variable Scoping Issues (Priority: MEDIUM)**
```typescript
// ERROR PATTERN:
Block-scoped variable 'isTyping' used before its declaration

// FILES AFFECTED:
- src/lib/hooks/useMessageInput.ts (lines 136, 154)

// SOLUTION NEEDED:
Reorder variable declarations or restructure useEffect dependencies
```

**4. useRef Null Assignment Issues (Priority: LOW)**
```typescript
// ERROR PATTERN:
Type 'undefined' is not assignable to type 'Timeout | null'

// FILES AFFECTED:
- src/lib/hooks/usePresence.ts (line 136)
- src/lib/hooks/useRealtimeConnection.ts (lines 382, 386)

// SOLUTION NEEDED:
Change undefined to null in assignments
```

**5. Component Prop Type Issues (Priority: LOW)**
```typescript
// ERROR PATTERN:
Property 'asChild' does not exist on type...

// FILES AFFECTED:
- Various visualization components
- Button/Tooltip component usage

// SOLUTION NEEDED:
Import correct component types or adjust prop usage
```

## 🛠 **DEBUGGING COMMANDS**

```bash
# Get exact error count
yarn type-check 2>&1 | grep -c "error TS"

# See first 20 errors
yarn type-check 2>&1 | head -40

# Find specific error patterns
yarn type-check 2>&1 | grep "COMPLETED"
yarn type-check 2>&1 | grep "circularly references"
yarn type-check 2>&1 | grep "used before"

# Run comprehensive quality check
yarn check-all
```

## 🎯 **SUCCESS CRITERIA**

- **Target**: 0 TypeScript errors
- **Current**: ~62 errors  
- **Remaining**: 6% of original errors
- **Timeline**: Should be achievable in 2-4 focused hours

## 📁 **KEY FILES TO FOCUS ON**

**High Impact (fix these first):**
1. `src/lib/hooks/usePhaseManagement.ts` - Phase duration indexing
2. `src/lib/hooks/useTurnManagement.ts` - Turn duration indexing  
3. `src/components/ui/use-toast.tsx` - Circular type references
4. `src/lib/hooks/useMessageInput.ts` - Variable scoping

**Medium Impact:**
- Various visualization components
- useRef null assignment fixes
- Component prop type adjustments

## 💡 **TIPS FOR CURSOR**

1. **Run `yarn type-check` first** to see current state
2. **Focus on one error category at a time** - don't mix different types of fixes
3. **Test frequently** with `yarn type-check` after each fix batch
4. **Use the established patterns** from completed fixes as templates
5. **The error count should drop significantly** with each category fixed

---

**You've got this! 94.2% complete means you're in the final stretch! 🏁**
