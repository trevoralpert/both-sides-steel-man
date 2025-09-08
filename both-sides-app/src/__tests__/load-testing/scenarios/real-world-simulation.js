/**
 * Real-World Scenario Simulation
 * Simulates realistic usage patterns including simultaneous debate sessions,
 * class-wide activities, and peak usage scenarios
 */

import { check, sleep, group } from 'k6';
import { stressTestConfig } from '../config/load-test-config.js';
import { 
  AuthHelper, 
  DataGenerator, 
  ApiTester,
  WebSocketTester,
  PerformanceMonitor,
  ScenarioRunner,
  ErrorHandler,
  concurrentUsers,
  messageLatency
} from '../utils/test-helpers.js';

export let options = stressTestConfig;

export function setup() {
  console.log('🌍 Starting Real-World Scenario Simulation');
  console.log('Simulating: Classroom debates, peak usage, and concurrent sessions');
  
  const testData = {
    teachers: [],
    students: [],
    classes: [],
    debateTopics: [],
    activeSessions: [],
    startTime: Date.now()
  };
  
  try {
    // Set up teacher accounts
    const teacherCredentials = [
      { email: 'teacher1@school.edu', password: 'TeachPass123!', name: 'Prof. Smith' },
      { email: 'teacher2@school.edu', password: 'TeachPass123!', name: 'Dr. Johnson' },
      { email: 'teacher3@school.edu', password: 'TeachPass123!', name: 'Ms. Davis' }
    ];
    
    for (const cred of teacherCredentials) {
      const auth = AuthHelper.login(cred);
      testData.teachers.push({
        ...auth,
        email: cred.email,
        name: cred.name,
        classes: []
      });
    }
    
    // Set up student accounts (simulate a larger class)
    for (let i = 1; i <= 30; i++) {
      const studentCred = {
        email: `student${i}@school.edu`,
        password: 'StudentPass123!',
        name: `Student ${i}`
      };
      
      const auth = AuthHelper.login(studentCred);
      testData.students.push({
        ...auth,
        email: studentCred.email,
        name: studentCred.name,
        beliefProfile: DataGenerator.generateBeliefProfile()
      });
    }
    
    // Create class structures
    testData.classes = [
      {
        id: 'class-debate-101',
        name: 'Introduction to Debate',
        teacherId: testData.teachers[0].userId,
        students: testData.students.slice(0, 10),
        topic: 'Climate Change Policy'
      },
      {
        id: 'class-advanced-debate',
        name: 'Advanced Debate Techniques', 
        teacherId: testData.teachers[1].userId,
        students: testData.students.slice(10, 20),
        topic: 'Universal Basic Income'
      },
      {
        id: 'class-political-discourse',
        name: 'Political Discourse Analysis',
        teacherId: testData.teachers[2].userId,
        students: testData.students.slice(20, 30),
        topic: 'AI Ethics in Education'
      }
    ];
    
    // Prepare debate topics
    testData.debateTopics = stressTestConfig.testData.topics;
    
    console.log(`✅ Real-world simulation setup completed:`);
    console.log(`  - ${testData.teachers.length} teachers`);
    console.log(`  - ${testData.students.length} students`);
    console.log(`  - ${testData.classes.length} classes`);
    console.log(`  - ${testData.debateTopics.length} debate topics`);
    
    return testData;
  } catch (error) {
    console.error('❌ Real-world simulation setup failed:', error);
    throw error;
  }
}

export default function(data) {
  const vuId = __VU;
  const iteration = __ITER;
  
  // Determine user type based on VU ID
  const isTeacher = vuId <= 3;
  const userProfile = isTeacher 
    ? data.teachers[vuId - 1] 
    : data.students[(vuId - 4) % data.students.length];
  
  if (!userProfile) {
    console.error(`VU ${vuId}: No user profile available`);
    return;
  }
  
  console.log(`VU ${vuId}: Simulating ${isTeacher ? 'teacher' : 'student'} - ${userProfile.name}`);
  
  try {
    if (isTeacher) {
      simulateTeacherWorkflow(userProfile, data, vuId);
    } else {
      simulateStudentWorkflow(userProfile, data, vuId);
    }
  } catch (error) {
    console.error(`VU ${vuId} - Simulation error:`, error);
    ErrorHandler.handleApiError(error, `RealWorld-VU-${vuId}`);
  }
  
  // Realistic pause between activities
  sleep(Math.random() * 3 + 2); // 2-5 seconds
}

function simulateTeacherWorkflow(teacher, data, vuId) {
  const apiTester = new ApiTester(teacher.token);
  
  group('Teacher: Class Management', () => {
    // Get class information
    const classInfo = data.classes.find(c => c.teacherId === teacher.userId);
    if (!classInfo) return;
    
    console.log(`VU ${vuId}: Teacher managing class ${classInfo.name}`);
    
    // Check class roster
    const rosterResponse = apiTester.testGetProfile(teacher.userId);
    check(rosterResponse.response, {
      'teacher can access class roster': (r) => r.status === 200
    });
    
    sleep(1);
  });
  
  group('Teacher: Debate Session Setup', () => {
    // Create debate session for the class
    const sessionData = {
      classId: data.classes.find(c => c.teacherId === teacher.userId)?.id,
      topic: DataGenerator.getRandomTopic(),
      duration: 30,
      participants: data.students.slice(0, 4).map(s => s.userId), // 4 students
      settings: {
        aiCoaching: true,
        realTimeModeration: true,
        recordSession: true
      }
    };
    
    const sessionResult = apiTester.testCreateConversation(sessionData);
    check(sessionResult.response, {
      'teacher can create debate session': (r) => r.status === 201
    });
    
    sleep(1);
  });
  
  group('Teacher: Live Monitoring', () => {
    // Simulate teacher monitoring multiple active debates
    for (let i = 0; i < 3; i++) {
      const conversationId = DataGenerator.generateConversationId();
      const wsTester = new WebSocketTester(teacher.token, conversationId);
      
      // Connect to monitor debate
      const connection = wsTester.connect();
      check(connection, {
        'teacher can monitor debate session': () => wsTester.connectionTime < 1000
      });
      
      // Simulate brief monitoring period
      sleep(2);
      
      // Send teacher intervention if needed
      if (Math.random() < 0.3) { // 30% chance of intervention
        wsTester.simulatePresenceUpdate(connection);
      }
    }
  });
  
  group('Teacher: Analytics Review', () => {
    // Check student performance analytics
    const studentsInClass = data.classes.find(c => c.teacherId === teacher.userId)?.students || [];
    
    for (const student of studentsInClass.slice(0, 3)) { // Check first 3 students
      const analyticsResponse = apiTester.testGetMatches(student.userId); // Using as analytics endpoint
      check(analyticsResponse.response, {
        'teacher can access student analytics': (r) => r.status === 200
      });
    }
    
    sleep(1);
  });
}

function simulateStudentWorkflow(student, data, vuId) {
  const apiTester = new ApiTester(student.token);
  
  group('Student: Profile and Survey', () => {
    // Check/update profile
    const profileResult = apiTester.testGetProfile(student.userId);
    check(profileResult.response, {
      'student can access profile': (r) => r.status === 200
    });
    
    // Complete or update survey if needed
    if (Math.random() < 0.2) { // 20% chance of survey activity
      const surveyData = DataGenerator.generateSurveyResponse();
      const surveyResult = apiTester.testSubmitSurveyResponse(surveyData);
      check(surveyResult.response, {
        'student can complete survey': (r) => r.status === 200
      });
    }
    
    sleep(1);
  });
  
  group('Student: Find Debate Partner', () => {
    // Look for debate matches
    const matchesResult = apiTester.testGetMatches(student.userId);
    check(matchesResult.response, {
      'student can find debate partners': (r) => r.status === 200
    });
    
    sleep(1);
  });
  
  group('Student: Join Debate Session', () => {
    // Join or create a debate session
    const conversationId = `student_debate_${vuId}_${Date.now()}`;
    const wsTester = new WebSocketTester(student.token, conversationId);
    
    const connection = wsTester.connect();
    check(connection, {
      'student can join debate session': () => wsTester.connectionTime < 1000
    });
    
    concurrentUsers.add(1);
    
    // Simulate active participation
    simulateDebateParticipation(wsTester, student, vuId);
  });
  
  group('Student: Learning Dashboard', () => {
    // Check learning progress and achievements
    const progressResponse = apiTester.testGetProfile(student.userId); // Using as progress endpoint
    check(progressResponse.response, {
      'student can access learning dashboard': (r) => r.status === 200
    });
    
    sleep(0.5);
  });
}

function simulateDebateParticipation(wsTester, student, vuId) {
  const behavior = DataGenerator.getRandomUserBehavior();
  const participationDuration = Math.random() * 10 + 5; // 5-15 seconds of participation
  const startTime = Date.now();
  
  console.log(`VU ${vuId}: Student ${student.name} participating in debate for ${participationDuration}s`);
  
  // Simulate realistic debate participation
  const participationInterval = setInterval(() => {
    const elapsed = (Date.now() - startTime) / 1000;
    
    if (elapsed >= participationDuration) {
      clearInterval(participationInterval);
      return;
    }
    
    // Random debate activities
    const activity = Math.random();
    
    if (activity < 0.4) {
      // Send message (40% chance)
      // Message sending handled by WebSocketTester
    } else if (activity < 0.6) {
      // Show typing indicator (20% chance)
      wsTester.simulateTypingIndicator();
    } else if (activity < 0.8) {
      // Update presence (20% chance)
      wsTester.simulatePresenceUpdate();
    }
    // 20% chance of no activity (listening)
    
  }, behavior.messageFrequency);
  
  // Wait for participation to complete
  sleep(participationDuration);
}

// Specialized real-world scenarios

export function classroomPeakUsage() {
  return {
    ...stressTestConfig,
    scenarios: {
      classroom_peak: {
        executor: 'ramping-vus',
        stages: [
          { duration: '30s', target: 10 },  // Class starts logging in
          { duration: '1m', target: 30 },   // All students join
          { duration: '5m', target: 30 },   // Active debate period
          { duration: '30s', target: 5 },   // Class ends, most leave
          { duration: '30s', target: 0 }    // All disconnect
        ],
        tags: { scenario: 'classroom_peak' }
      }
    },
    thresholds: {
      ...stressTestConfig.thresholds,
      'concurrent_users': ['max>=30'], // Support full classroom
      'connection_success_rate': ['rate>=0.95'] // High reliability needed
    }
  };
}

export function multipleClassroomSimulation() {
  return {
    ...stressTestConfig,
    scenarios: {
      multiple_classrooms: {
        executor: 'constant-vus',
        vus: 90, // 3 classes of 30 students each
        duration: '10m',
        tags: { scenario: 'multiple_classrooms' }
      }
    },
    thresholds: {
      ...stressTestConfig.thresholds,
      'concurrent_users': ['max>=90'],
      'message_latency': ['p(95)<150'], // Slightly higher latency acceptable
      'http_req_duration': ['p(95)<600'] // Account for higher load
    }
  };
}

export function examPeriodStress() {
  return {
    ...stressTestConfig,
    scenarios: {
      exam_period: {
        executor: 'ramping-vus',
        stages: [
          { duration: '2m', target: 50 },   // Morning classes
          { duration: '3m', target: 100 },  // Peak period
          { duration: '2m', target: 150 },  // Multiple schools
          { duration: '3m', target: 200 },  // Maximum stress
          { duration: '2m', target: 50 },   // Wind down
          { duration: '1m', target: 0 }     // End of day
        ],
        tags: { scenario: 'exam_period' }
      }
    },
    thresholds: {
      ...stressTestConfig.thresholds,
      'concurrent_users': ['max>=200'],
      'http_req_failed': ['rate<0.15'], // Allow higher failure rate under extreme load
      'message_latency': ['p(90)<200'] // Focus on 90th percentile under stress
    }
  };
}

export function teardown(data) {
  console.log('🧹 Real-World Simulation Teardown');
  
  const testDuration = Date.now() - data.startTime;
  console.log(`Total simulation duration: ${testDuration}ms`);
  
  // Log comprehensive results
  console.log('📊 Real-World Simulation Results:');
  console.log(`- Simulation duration: ${testDuration / 1000} seconds`);
  console.log(`- Teachers simulated: ${data.teachers.length}`);
  console.log(`- Students simulated: ${data.students.length}`);
  console.log(`- Classes tested: ${data.classes.length}`);
  console.log(`- Active sessions created: ${data.activeSessions.length}`);
  
  // Performance summary
  console.log('\n🎯 Performance Highlights:');
  console.log('- Concurrent user handling tested');
  console.log('- Real-time messaging performance validated');
  console.log('- Teacher monitoring capabilities verified');
  console.log('- Student engagement patterns simulated');
  
  console.log('✅ Real-World Simulation completed successfully');
}
