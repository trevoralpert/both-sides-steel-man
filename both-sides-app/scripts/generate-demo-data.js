#!/usr/bin/env node

/**
 * Demo Data Generation Script
 * Task 11.1.1: Production Environment Validation & Demo Data Setup
 * 
 * Generates comprehensive demo data for pilot testing:
 * - 20+ realistic teacher profiles
 * - 100+ student profiles with diverse belief systems
 * - 15+ debate topics across categories
 * - 50+ sample debate sessions
 * - Historical analytics data
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class DemoDataGenerator {
  constructor() {
    this.data = {
      teachers: [],
      students: [],
      topics: [],
      sessions: [],
      analytics: {},
      metadata: {
        generated: new Date().toISOString(),
        version: '1.0.0',
        purpose: 'Phase 11 MVP Launch Demo Data'
      }
    };
  }

  generateTeachers() {
    console.log('👨‍🏫 Generating teacher profiles...');
    
    const teacherNames = [
      { first: 'Sarah', last: 'Johnson', subject: 'Political Science' },
      { first: 'Michael', last: 'Chen', subject: 'History' },
      { first: 'Emily', last: 'Rodriguez', subject: 'Philosophy' },
      { first: 'David', last: 'Thompson', subject: 'Economics' },
      { first: 'Lisa', last: 'Williams', subject: 'Social Studies' },
      { first: 'James', last: 'Brown', subject: 'Ethics' },
      { first: 'Maria', last: 'Garcia', subject: 'Debate & Rhetoric' },
      { first: 'Robert', last: 'Davis', subject: 'Government' },
      { first: 'Jennifer', last: 'Miller', subject: 'International Relations' },
      { first: 'Christopher', last: 'Wilson', subject: 'Critical Thinking' },
      { first: 'Amanda', last: 'Moore', subject: 'Civics' },
      { first: 'Daniel', last: 'Taylor', subject: 'Public Policy' },
      { first: 'Jessica', last: 'Anderson', subject: 'Constitutional Law' },
      { first: 'Matthew', last: 'Thomas', subject: 'Environmental Studies' },
      { first: 'Ashley', last: 'Jackson', subject: 'Media Literacy' },
      { first: 'Ryan', last: 'White', subject: 'Logic & Reasoning' },
      { first: 'Nicole', last: 'Harris', subject: 'World Cultures' },
      { first: 'Kevin', last: 'Martin', subject: 'Business Ethics' },
      { first: 'Rachel', last: 'Thompson', subject: 'Psychology' },
      { first: 'Brandon', last: 'Lee', subject: 'Sociology' }
    ];

    const schools = [
      'Lincoln High School',
      'Roosevelt Middle School', 
      'Washington Academy',
      'Jefferson Preparatory',
      'Madison Charter School',
      'Hamilton Institute',
      'Franklin High School',
      'Adams Middle School'
    ];

    teacherNames.forEach((teacher, index) => {
      this.data.teachers.push({
        id: `teacher-${index + 1}`,
        firstName: teacher.first,
        lastName: teacher.last,
        email: `${teacher.first.toLowerCase()}.${teacher.last.toLowerCase()}@${schools[index % schools.length].toLowerCase().replace(/\s+/g, '')}.edu`,
        subject: teacher.subject,
        school: schools[index % schools.length],
        experience: Math.floor(Math.random() * 20) + 3, // 3-23 years
        gradeLevel: ['6-8', '9-12', '6-12'][Math.floor(Math.random() * 3)],
        bio: `Experienced ${teacher.subject} educator passionate about developing critical thinking skills through structured debate.`,
        joinDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        preferences: {
          debateStyle: ['formal', 'socratic', 'fishbowl'][Math.floor(Math.random() * 3)],
          sessionLength: [30, 45, 60][Math.floor(Math.random() * 3)],
          maxStudents: Math.floor(Math.random() * 10) + 15 // 15-25 students
        }
      });
    });

    console.log(`✅ Generated ${this.data.teachers.length} teacher profiles`);
  }

  generateStudents() {
    console.log('👨‍🎓 Generating student profiles...');
    
    const firstNames = [
      'Alex', 'Jordan', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Avery', 'Quinn',
      'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason',
      'Isabella', 'William', 'Mia', 'James', 'Charlotte', 'Benjamin', 'Amelia', 'Lucas',
      'Harper', 'Henry', 'Evelyn', 'Alexander', 'Abigail', 'Michael', 'Emily', 'Daniel',
      'Elizabeth', 'Jacob', 'Sofia', 'Logan', 'Avery', 'Jackson', 'Ella', 'Levi',
      'Scarlett', 'Sebastian', 'Grace', 'Mateo', 'Chloe', 'Jack', 'Victoria', 'Owen',
      'Riley', 'Theodore', 'Aria', 'Aiden', 'Zoe', 'Samuel', 'Lily', 'Joseph',
      'Elena', 'John', 'Stella', 'David', 'Aurora', 'Wyatt', 'Natalie', 'Matthew',
      'Leah', 'Luke', 'Hazel', 'Asher', 'Violet', 'Carter', 'Nova', 'Julian',
      'Hannah', 'Grayson', 'Emilia', 'Leo', 'Zara', 'Jayden', 'Ivy', 'Gabriel',
      'Ellie', 'Isaac', 'Tessa', 'Lincoln', 'Mila', 'Anthony', 'Kinsley', 'Hudson',
      'Delilah', 'Dylan', 'Maya', 'Ezra', 'Lyla', 'Thomas', 'Keira', 'Charles',
      'Paisley', 'Christopher', 'Annabelle', 'Jaxon', 'Nora', 'Maverick', 'Remi'
    ];

    const lastNames = [
      'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
      'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
      'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
      'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young',
      'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
      'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
      'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker'
    ];

    const beliefSystems = [
      { category: 'Political', values: ['Progressive', 'Conservative', 'Libertarian', 'Moderate', 'Independent'] },
      { category: 'Economic', values: ['Capitalist', 'Socialist', 'Mixed Economy', 'Keynesian', 'Austrian'] },
      { category: 'Environmental', values: ['Environmentalist', 'Conservationist', 'Pragmatist', 'Skeptical', 'Moderate'] },
      { category: 'Social', values: ['Liberal', 'Traditional', 'Communitarian', 'Individualist', 'Moderate'] },
      { category: 'Educational', values: ['Progressive', 'Traditional', 'Constructivist', 'Behaviorist', 'Eclectic'] }
    ];

    const interests = [
      'Climate Change', 'Technology Ethics', 'Social Justice', 'Economic Policy', 'International Relations',
      'Healthcare', 'Education Reform', 'Criminal Justice', 'Immigration', 'Privacy Rights',
      'Artificial Intelligence', 'Space Exploration', 'Renewable Energy', 'Mental Health', 'Sports',
      'Arts & Culture', 'Science', 'History', 'Philosophy', 'Literature'
    ];

    for (let i = 0; i < 120; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const grade = Math.floor(Math.random() * 7) + 6; // Grades 6-12
      
      // Generate diverse belief system
      const studentBeliefs = {};
      beliefSystems.forEach(system => {
        studentBeliefs[system.category] = system.values[Math.floor(Math.random() * system.values.length)];
      });

      // Generate interests (3-6 interests per student)
      const numInterests = Math.floor(Math.random() * 4) + 3;
      const studentInterests = [];
      for (let j = 0; j < numInterests; j++) {
        const interest = interests[Math.floor(Math.random() * interests.length)];
        if (!studentInterests.includes(interest)) {
          studentInterests.push(interest);
        }
      }

      this.data.students.push({
        id: `student-${i + 1}`,
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 100)}@student.edu`,
        grade,
        school: this.data.teachers[Math.floor(Math.random() * this.data.teachers.length)].school,
        beliefs: studentBeliefs,
        interests: studentInterests,
        debateExperience: ['Beginner', 'Intermediate', 'Advanced'][Math.floor(Math.random() * 3)],
        communicationStyle: ['Analytical', 'Emotional', 'Balanced', 'Direct', 'Diplomatic'][Math.floor(Math.random() * 5)],
        joinDate: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(),
        stats: {
          debatesParticipated: Math.floor(Math.random() * 20),
          averageRating: (Math.random() * 2 + 3).toFixed(1), // 3.0-5.0
          topicsExplored: Math.floor(Math.random() * 15) + 1
        }
      });
    }

    console.log(`✅ Generated ${this.data.students.length} student profiles`);
  }

  generateDebateTopics() {
    console.log('💭 Generating debate topics...');
    
    const topics = [
      {
        category: 'Environmental',
        difficulty: 'Intermediate',
        topics: [
          'Should governments prioritize economic growth over environmental protection?',
          'Is nuclear energy a viable solution to climate change?',
          'Should plastic bags be banned worldwide?',
          'Is individual action sufficient to address climate change?'
        ]
      },
      {
        category: 'Technology',
        difficulty: 'Advanced',
        topics: [
          'Should artificial intelligence development be regulated by government?',
          'Is social media harmful to democracy?',
          'Should schools replace textbooks with tablets?',
          'Is privacy dead in the digital age?'
        ]
      },
      {
        category: 'Social Issues',
        difficulty: 'Intermediate',
        topics: [
          'Should college education be free for all students?',
          'Is standardized testing an effective measure of student ability?',
          'Should the voting age be lowered to 16?',
          'Is remote work better than office work?'
        ]
      },
      {
        category: 'Economics',
        difficulty: 'Advanced',
        topics: [
          'Should there be a universal basic income?',
          'Is capitalism the best economic system?',
          'Should minimum wage be $15 per hour nationally?',
          'Are cryptocurrencies the future of money?'
        ]
      },
      {
        category: 'Ethics',
        difficulty: 'Beginner',
        topics: [
          'Is it ever acceptable to lie?',
          'Should animals have the same rights as humans?',
          'Is it ethical to eat meat?',
          'Should parents monitor their children\'s internet activity?'
        ]
      },
      {
        category: 'Health',
        difficulty: 'Intermediate',
        topics: [
          'Should healthcare be a human right?',
          'Is mental health as important as physical health?',
          'Should junk food be taxed like cigarettes?',
          'Is genetic engineering ethical?'
        ]
      }
    ];

    topics.forEach((category, categoryIndex) => {
      category.topics.forEach((topic, topicIndex) => {
        this.data.topics.push({
          id: `topic-${categoryIndex + 1}-${topicIndex + 1}`,
          title: topic,
          category: category.category,
          difficulty: category.difficulty,
          description: `Explore different perspectives on ${topic.toLowerCase()}`,
          tags: [category.category.toLowerCase(), category.difficulty.toLowerCase()],
          estimatedDuration: [30, 45, 60][Math.floor(Math.random() * 3)],
          preparationMaterials: [
            'Background reading materials',
            'Statistical data and research',
            'Expert opinion articles',
            'Historical context'
          ],
          learningObjectives: [
            'Develop critical thinking skills',
            'Practice evidence-based argumentation',
            'Understand multiple perspectives',
            'Improve communication skills'
          ],
          createdDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString()
        });
      });
    });

    console.log(`✅ Generated ${this.data.topics.length} debate topics`);
  }

  generateDebateSessions() {
    console.log('🗣️ Generating sample debate sessions...');
    
    const sessionStatuses = ['completed', 'in-progress', 'scheduled', 'cancelled'];
    const outcomes = ['productive', 'heated', 'insightful', 'challenging', 'educational'];
    
    for (let i = 0; i < 60; i++) {
      const teacher = this.data.teachers[Math.floor(Math.random() * this.data.teachers.length)];
      const topic = this.data.topics[Math.floor(Math.random() * this.data.topics.length)];
      const status = sessionStatuses[Math.floor(Math.random() * sessionStatuses.length)];
      
      // Select 4-8 students for the session
      const numParticipants = Math.floor(Math.random() * 5) + 4;
      const participants = [];
      const availableStudents = [...this.data.students];
      
      for (let j = 0; j < numParticipants && availableStudents.length > 0; j++) {
        const randomIndex = Math.floor(Math.random() * availableStudents.length);
        participants.push(availableStudents.splice(randomIndex, 1)[0]);
      }

      const sessionDate = new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000);
      
      this.data.sessions.push({
        id: `session-${i + 1}`,
        title: `${topic.title} - ${teacher.school}`,
        topicId: topic.id,
        teacherId: teacher.id,
        participants: participants.map(p => ({
          studentId: p.id,
          position: Math.random() > 0.5 ? 'pro' : 'con',
          preparationTime: Math.floor(Math.random() * 30) + 15, // 15-45 minutes
          participationScore: (Math.random() * 2 + 3).toFixed(1) // 3.0-5.0
        })),
        status,
        scheduledDate: sessionDate.toISOString(),
        actualStartTime: status === 'completed' ? sessionDate.toISOString() : null,
        duration: status === 'completed' ? Math.floor(Math.random() * 30) + 30 : null, // 30-60 minutes
        outcome: status === 'completed' ? outcomes[Math.floor(Math.random() * outcomes.length)] : null,
        metrics: status === 'completed' ? {
          engagementLevel: (Math.random() * 2 + 3).toFixed(1),
          learningOutcome: (Math.random() * 2 + 3).toFixed(1),
          respectfulnessScore: (Math.random() * 1.5 + 3.5).toFixed(1),
          evidenceQuality: (Math.random() * 2 + 3).toFixed(1)
        } : null,
        feedback: status === 'completed' ? {
          teacherNotes: 'Students showed good engagement and critical thinking skills.',
          studentReflections: participants.slice(0, 2).map(p => ({
            studentId: p.id,
            reflection: 'This debate helped me understand different perspectives on the topic.'
          }))
        } : null,
        createdDate: sessionDate.toISOString()
      });
    }

    console.log(`✅ Generated ${this.data.sessions.length} debate sessions`);
  }

  generateAnalyticsData() {
    console.log('📊 Generating historical analytics data...');
    
    const completedSessions = this.data.sessions.filter(s => s.status === 'completed');
    
    this.data.analytics = {
      overview: {
        totalUsers: this.data.teachers.length + this.data.students.length,
        totalSessions: this.data.sessions.length,
        completedSessions: completedSessions.length,
        totalTopics: this.data.topics.length,
        averageSessionDuration: completedSessions.length > 0 
          ? Math.round(completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / completedSessions.length)
          : 0
      },
      engagement: {
        dailyActiveUsers: Math.floor(Math.random() * 50) + 20,
        weeklyActiveUsers: Math.floor(Math.random() * 150) + 80,
        monthlyActiveUsers: Math.floor(Math.random() * 300) + 200,
        averageSessionsPerUser: (completedSessions.length / this.data.students.length).toFixed(1)
      },
      performance: {
        averageEngagementScore: completedSessions.length > 0
          ? (completedSessions.reduce((sum, s) => sum + parseFloat(s.metrics?.engagementLevel || 0), 0) / completedSessions.length).toFixed(1)
          : '0.0',
        averageLearningOutcome: completedSessions.length > 0
          ? (completedSessions.reduce((sum, s) => sum + parseFloat(s.metrics?.learningOutcome || 0), 0) / completedSessions.length).toFixed(1)
          : '0.0',
        topPerformingTopics: this.data.topics.slice(0, 5).map(t => ({
          topicId: t.id,
          title: t.title,
          sessionsCount: Math.floor(Math.random() * 10) + 1,
          averageRating: (Math.random() * 1.5 + 3.5).toFixed(1)
        }))
      },
      trends: {
        monthlyGrowth: '+15%',
        sessionCompletionRate: '87%',
        userRetentionRate: '73%',
        topCategories: [
          { category: 'Environmental', percentage: '25%' },
          { category: 'Technology', percentage: '22%' },
          { category: 'Social Issues', percentage: '20%' },
          { category: 'Economics', percentage: '18%' },
          { category: 'Ethics', percentage: '15%' }
        ]
      }
    };

    console.log('✅ Generated comprehensive analytics data');
  }

  async saveData() {
    console.log('💾 Saving demo data...');
    
    const outputDir = path.join(__dirname, '..', 'demo-data');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save complete dataset
    fs.writeFileSync(
      path.join(outputDir, 'complete-demo-data.json'),
      JSON.stringify(this.data, null, 2)
    );

    // Save individual datasets
    fs.writeFileSync(
      path.join(outputDir, 'teachers.json'),
      JSON.stringify(this.data.teachers, null, 2)
    );

    fs.writeFileSync(
      path.join(outputDir, 'students.json'),
      JSON.stringify(this.data.students, null, 2)
    );

    fs.writeFileSync(
      path.join(outputDir, 'topics.json'),
      JSON.stringify(this.data.topics, null, 2)
    );

    fs.writeFileSync(
      path.join(outputDir, 'sessions.json'),
      JSON.stringify(this.data.sessions, null, 2)
    );

    fs.writeFileSync(
      path.join(outputDir, 'analytics.json'),
      JSON.stringify(this.data.analytics, null, 2)
    );

    // Generate summary report
    const summary = {
      generated: this.data.metadata.generated,
      summary: {
        teachers: this.data.teachers.length,
        students: this.data.students.length,
        topics: this.data.topics.length,
        sessions: this.data.sessions.length,
        completedSessions: this.data.sessions.filter(s => s.status === 'completed').length
      },
      files: [
        'complete-demo-data.json',
        'teachers.json',
        'students.json', 
        'topics.json',
        'sessions.json',
        'analytics.json'
      ]
    };

    fs.writeFileSync(
      path.join(outputDir, 'README.json'),
      JSON.stringify(summary, null, 2)
    );

    console.log(`✅ Demo data saved to ${outputDir}`);
    console.log(`📁 Files created: ${summary.files.length}`);
    
    return outputDir;
  }

  printSummary() {
    console.log('\n📋 Demo Data Generation Summary');
    console.log('================================');
    console.log(`👨‍🏫 Teachers: ${this.data.teachers.length}`);
    console.log(`👨‍🎓 Students: ${this.data.students.length}`);
    console.log(`💭 Topics: ${this.data.topics.length}`);
    console.log(`🗣️  Sessions: ${this.data.sessions.length}`);
    console.log(`✅ Completed Sessions: ${this.data.sessions.filter(s => s.status === 'completed').length}`);
    console.log(`📊 Analytics Data: Generated`);
    console.log(`🕐 Generated: ${this.data.metadata.generated}`);
    console.log('\n🎯 Ready for pilot testing and demonstrations!');
  }

  async generate() {
    console.log('🚀 Starting Demo Data Generation for Phase 11 MVP Launch\n');
    
    this.generateTeachers();
    this.generateStudents();
    this.generateDebateTopics();
    this.generateDebateSessions();
    this.generateAnalyticsData();
    
    const outputDir = await this.saveData();
    this.printSummary();
    
    return {
      success: true,
      outputDirectory: outputDir,
      data: this.data
    };
  }
}

// Run demo data generation if called directly
if (require.main === module) {
  const generator = new DemoDataGenerator();
  
  generator.generate()
    .then((result) => {
      console.log('\n✅ Demo data generation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Demo data generation failed:', error);
      process.exit(1);
    });
}

module.exports = DemoDataGenerator;
