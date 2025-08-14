/**
 * Phase 3 Task 3.1.1.2: Survey Question Seeder
 * Populates database with research-backed belief mapping questions
 */

import { PrismaClient } from '@prisma/client';
import { BELIEF_MAPPING_QUESTIONS } from '../data/belief-mapping-questions';

const prisma = new PrismaClient();

export async function seedSurveyQuestions() {
  console.log('🌱 Seeding survey questions...');

  try {
    // Create the main belief mapping survey
    const survey = await prisma.survey.upsert({
      where: { id: 'belief-mapping-v1' },
      update: {},
      create: {
        id: 'belief-mapping-v1',
        name: 'Political Belief Mapping Survey',
        description: 'Comprehensive survey to map student political beliefs and ideologies for educational debate matching',
        version: 1,
        is_active: true,
      },
    });

    console.log(`✅ Created survey: ${survey.name}`);

    // Seed all questions
    let questionCount = 0;
    for (const questionDef of BELIEF_MAPPING_QUESTIONS) {
      await prisma.surveyQuestion.upsert({
        where: { id: questionDef.id },
        update: {
          question: questionDef.question,
          options: questionDef.options || null,
          scale: questionDef.scale || null,
          weight: questionDef.weight,
          ideology_mapping: questionDef.ideology_mapping,
          required: questionDef.required,
          randomize_within_sec: questionDef.randomize_within_section,
          is_active: true,
        },
        create: {
          id: questionDef.id,
          survey_id: survey.id,
          section: questionDef.section,
          order: questionDef.order,
          category: questionDef.category,
          type: questionDef.type,
          question: questionDef.question,
          options: questionDef.options || null,
          scale: questionDef.scale || null,
          weight: questionDef.weight,
          ideology_mapping: questionDef.ideology_mapping,
          required: questionDef.required,
          randomize_within_sec: questionDef.randomize_within_section,
          is_active: true,
        },
      });
      questionCount++;
    }

    console.log(`✅ Seeded ${questionCount} survey questions`);

    // Validate the seeded question set
    const { isBalanced, coverage, recommendations } = await validateSeededQuestions();
    
    if (isBalanced) {
      console.log('✅ Question set is balanced and complete');
    } else {
      console.log('⚠️  Question set validation warnings:');
      recommendations.forEach(rec => console.log(`   - ${rec}`));
    }

    console.log('📊 Question coverage by category:');
    Object.entries(coverage).forEach(([category, count]) => {
      console.log(`   - ${category}: ${count} questions`);
    });

    console.log('🎉 Survey seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding survey questions:', error);
    throw error;
  }
}

async function validateSeededQuestions() {
  // This would use the QuestionContentValidator from our data file
  // For now, return basic validation
  const questions = await prisma.surveyQuestion.findMany({
    where: { is_active: true }
  });

  const coverage: Record<string, number> = {};
  questions.forEach(q => {
    coverage[q.category] = (coverage[q.category] || 0) + 1;
  });

  const isBalanced = Object.values(coverage).every(count => count >= 2);
  const recommendations: string[] = [];

  if (!isBalanced) {
    Object.entries(coverage).forEach(([category, count]) => {
      if (count < 2) {
        recommendations.push(`Add more ${category.toLowerCase()} questions (current: ${count})`);
      }
    });
  }

  return { isBalanced, coverage, recommendations };
}

// Run seeder if called directly
if (require.main === module) {
  seedSurveyQuestions()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
