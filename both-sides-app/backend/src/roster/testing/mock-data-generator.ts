/**
 * Task 2.3.4.2: Mock Data Generation for Demo Purposes
 * 
 * This module generates realistic educational data for testing and demonstration.
 * It creates organizations, users, classes, and enrollments with proper relationships,
 * realistic names, and configurable scenarios.
 * 
 * Features:
 * - Multiple data scenarios (small school, large district, etc.)
 * - Realistic name and email generation
 * - Proper entity relationships and constraints
 * - Configurable data amounts and characteristics
 * - Academic calendar awareness
 * - Diverse student and teacher populations
 */

import { Organization, Class, User, Enrollment, UserRole, OrganizationType, EnrollmentStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

/**
 * Data generation scenarios
 */
export enum MockDataScenario {
  SMALL_SCHOOL = 'small_school',           // ~200 students, 15 teachers, 20 classes
  MEDIUM_SCHOOL = 'medium_school',         // ~600 students, 40 teachers, 60 classes  
  LARGE_SCHOOL = 'large_school',           // ~1200 students, 80 teachers, 120 classes
  SMALL_DISTRICT = 'small_district',       // 3 schools, ~1800 students total
  MEDIUM_DISTRICT = 'medium_district',     // 8 schools, ~4800 students total
  LARGE_DISTRICT = 'large_district',       // 15 schools, ~9000 students total
  UNIVERSITY = 'university',               // Large university with departments
  DEMO = 'demo'                           // Small demo set for presentations
}

/**
 * Configuration for mock data generation
 */
export interface MockDataConfig {
  // Organization settings
  organizationCount: number;
  organizationTypes: OrganizationType[];
  organizationHierarchy: boolean;
  
  // User settings
  studentCount: number;
  teacherCount: number;
  adminCount: number;
  
  // Class settings
  classCount: number;
  subjectsPerClass: string[];
  gradeLevels: string[];
  academicYears: string[];
  terms: string[];
  
  // Enrollment settings
  enrollmentDistribution: {
    averageClassSize: number;
    minClassSize: number;
    maxClassSize: number;
  };
  
  // Realism settings
  includeInactiveUsers: boolean;
  includeDroppedEnrollments: boolean;
  realEmailDomains: string[];
  nameListSize: 'small' | 'medium' | 'large';
}

/**
 * Generated data set
 */
export interface MockDataSet {
  organizations: Organization[];
  users: User[];
  classes: Class[];
  enrollments: Enrollment[];
  metadata: {
    scenario: MockDataScenario;
    generatedAt: Date;
    totalEntities: number;
    relationships: {
      orgHierarchy: number;
      teacherClassAssignments: number;
      studentEnrollments: number;
    };
  };
}

/**
 * Realistic data pools for generation
 */
const NAME_POOLS = {
  firstNames: {
    common: [
      'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth',
      'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Christopher', 'Karen',
      'Charles', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Helen', 'Mark', 'Sandra',
      'Alex', 'Emma', 'Noah', 'Olivia', 'Liam', 'Ava', 'Mason', 'Sophia', 'Logan', 'Isabella',
      'Lucas', 'Mia', 'Jackson', 'Charlotte', 'Aiden', 'Abigail', 'Sebastian', 'Emily', 'Owen', 'Harper'
    ],
    diverse: [
      'Aaliyah', 'Ahmed', 'Amara', 'Antonio', 'Aria', 'Carlos', 'Destiny', 'Diego', 'Elena', 'Fatima',
      'Gabriel', 'Grace', 'Hassan', 'Ines', 'Jamal', 'Jasmine', 'Kai', 'Layla', 'Luis', 'Maya',
      'Naomi', 'Omar', 'Priya', 'Rafael', 'Samira', 'Sofia', 'Tariq', 'Valentina', 'Yuki', 'Zara'
    ]
  },
  
  lastNames: {
    common: [
      'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
      'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
      'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'
    ],
    international: [
      'Ahmed', 'Chen', 'Kim', 'Patel', 'Singh', 'Nguyen', 'Ali', 'Wang', 'Liu', 'Kumar',
      'Okafor', 'Schmidt', 'Müller', 'Kowalski', 'Rossi', 'Sato', 'Tanaka', 'Johansson', 'Nielsen', 'Hansen'
    ]
  },
  
  organizationNames: {
    schools: [
      'Lincoln Elementary', 'Washington Middle School', 'Roosevelt High School', 'Jefferson Academy',
      'Madison Preparatory', 'Hamilton STEM School', 'Franklin Arts Academy', 'Adams International',
      'Monroe Technical High', 'Tyler Community School', 'Pierce Elementary', 'Fillmore Middle',
      'Buchanan High School', 'Garfield Elementary', 'Arthur Middle School', 'Cleveland High'
    ],
    districts: [
      'Metro Educational District', 'Valley School District', 'Riverside Unified', 'Mountain View District',
      'Coastal Education System', 'Central City Schools', 'Northside District', 'Southland Educational',
      'Eastside Unified', 'Westfield School System', 'Heritage District', 'Pioneer Educational'
    ],
    universities: [
      'State University', 'Technical Institute', 'Community College', 'Liberal Arts College',
      'Research University', 'Metropolitan University', 'Regional College', 'City University'
    ]
  },
  
  subjects: [
    'Mathematics', 'English Language Arts', 'Science', 'Social Studies', 'History', 'Biology',
    'Chemistry', 'Physics', 'Algebra', 'Geometry', 'Calculus', 'Statistics', 'Literature',
    'Writing', 'Geography', 'Economics', 'Government', 'Art', 'Music', 'Physical Education',
    'Spanish', 'French', 'German', 'Computer Science', 'Engineering', 'Health', 'Psychology'
  ],
  
  gradeLevels: [
    'K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12',
    'Pre-K', 'Kindergarten', 'Freshman', 'Sophomore', 'Junior', 'Senior'
  ],
  
  emailDomains: {
    educational: [
      'school.edu', 'district.k12.us', 'academy.edu', 'university.edu', 
      'college.edu', 'institute.edu', 'learning.org'
    ],
    personal: [
      'gmail.com', 'yahoo.com', 'outlook.com', 'icloud.com', 'aol.com'
    ]
  }
};

/**
 * Default configurations for different scenarios
 */
const SCENARIO_CONFIGS: Record<MockDataScenario, MockDataConfig> = {
  [MockDataScenario.SMALL_SCHOOL]: {
    organizationCount: 1,
    organizationTypes: [OrganizationType.SCHOOL],
    organizationHierarchy: false,
    studentCount: 200,
    teacherCount: 15,
    adminCount: 2,
    classCount: 20,
    subjectsPerClass: NAME_POOLS.subjects.slice(0, 8),
    gradeLevels: ['9', '10', '11', '12'],
    academicYears: ['2024-2025'],
    terms: ['Fall', 'Spring'],
    enrollmentDistribution: { averageClassSize: 22, minClassSize: 15, maxClassSize: 28 },
    includeInactiveUsers: true,
    includeDroppedEnrollments: true,
    realEmailDomains: NAME_POOLS.emailDomains.educational,
    nameListSize: 'medium'
  },
  
  [MockDataScenario.MEDIUM_SCHOOL]: {
    organizationCount: 1,
    organizationTypes: [OrganizationType.SCHOOL],
    organizationHierarchy: false,
    studentCount: 600,
    teacherCount: 40,
    adminCount: 4,
    classCount: 60,
    subjectsPerClass: NAME_POOLS.subjects.slice(0, 12),
    gradeLevels: ['6', '7', '8', '9', '10', '11', '12'],
    academicYears: ['2024-2025'],
    terms: ['Fall', 'Spring'],
    enrollmentDistribution: { averageClassSize: 25, minClassSize: 18, maxClassSize: 32 },
    includeInactiveUsers: true,
    includeDroppedEnrollments: true,
    realEmailDomains: NAME_POOLS.emailDomains.educational,
    nameListSize: 'medium'
  },
  
  [MockDataScenario.LARGE_SCHOOL]: {
    organizationCount: 1,
    organizationTypes: [OrganizationType.SCHOOL],
    organizationHierarchy: false,
    studentCount: 1200,
    teacherCount: 80,
    adminCount: 6,
    classCount: 120,
    subjectsPerClass: NAME_POOLS.subjects,
    gradeLevels: ['9', '10', '11', '12'],
    academicYears: ['2024-2025'],
    terms: ['Fall', 'Spring'],
    enrollmentDistribution: { averageClassSize: 28, minClassSize: 20, maxClassSize: 35 },
    includeInactiveUsers: true,
    includeDroppedEnrollments: true,
    realEmailDomains: NAME_POOLS.emailDomains.educational,
    nameListSize: 'large'
  },
  
  [MockDataScenario.SMALL_DISTRICT]: {
    organizationCount: 4, // 1 district + 3 schools
    organizationTypes: [OrganizationType.DISTRICT, OrganizationType.SCHOOL],
    organizationHierarchy: true,
    studentCount: 1800,
    teacherCount: 120,
    adminCount: 8,
    classCount: 180,
    subjectsPerClass: NAME_POOLS.subjects.slice(0, 15),
    gradeLevels: ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
    academicYears: ['2024-2025'],
    terms: ['Fall', 'Spring'],
    enrollmentDistribution: { averageClassSize: 24, minClassSize: 16, maxClassSize: 30 },
    includeInactiveUsers: true,
    includeDroppedEnrollments: true,
    realEmailDomains: NAME_POOLS.emailDomains.educational,
    nameListSize: 'large'
  },
  
  [MockDataScenario.DEMO]: {
    organizationCount: 2,
    organizationTypes: [OrganizationType.DISTRICT, OrganizationType.SCHOOL],
    organizationHierarchy: true,
    studentCount: 50,
    teacherCount: 8,
    adminCount: 2,
    classCount: 10,
    subjectsPerClass: ['Mathematics', 'English', 'Science', 'History', 'Art'],
    gradeLevels: ['9', '10', '11', '12'],
    academicYears: ['2024-2025'],
    terms: ['Fall'],
    enrollmentDistribution: { averageClassSize: 12, minClassSize: 8, maxClassSize: 15 },
    includeInactiveUsers: false,
    includeDroppedEnrollments: false,
    realEmailDomains: NAME_POOLS.emailDomains.educational,
    nameListSize: 'small'
  },
  
  // Add other scenarios with similar detailed configs...
  [MockDataScenario.MEDIUM_DISTRICT]: {
    organizationCount: 9, // 1 district + 8 schools
    organizationTypes: [OrganizationType.DISTRICT, OrganizationType.SCHOOL],
    organizationHierarchy: true,
    studentCount: 4800,
    teacherCount: 320,
    adminCount: 20,
    classCount: 480,
    subjectsPerClass: NAME_POOLS.subjects,
    gradeLevels: ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
    academicYears: ['2024-2025'],
    terms: ['Fall', 'Spring'],
    enrollmentDistribution: { averageClassSize: 25, minClassSize: 18, maxClassSize: 32 },
    includeInactiveUsers: true,
    includeDroppedEnrollments: true,
    realEmailDomains: NAME_POOLS.emailDomains.educational,
    nameListSize: 'large'
  },
  
  [MockDataScenario.LARGE_DISTRICT]: {
    organizationCount: 16, // 1 district + 15 schools
    organizationTypes: [OrganizationType.DISTRICT, OrganizationType.SCHOOL],
    organizationHierarchy: true,
    studentCount: 9000,
    teacherCount: 600,
    adminCount: 35,
    classCount: 900,
    subjectsPerClass: NAME_POOLS.subjects,
    gradeLevels: ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
    academicYears: ['2024-2025'],
    terms: ['Fall', 'Spring'],
    enrollmentDistribution: { averageClassSize: 26, minClassSize: 20, maxClassSize: 35 },
    includeInactiveUsers: true,
    includeDroppedEnrollments: true,
    realEmailDomains: NAME_POOLS.emailDomains.educational,
    nameListSize: 'large'
  },
  
  [MockDataScenario.UNIVERSITY]: {
    organizationCount: 8, // 1 university + 7 departments
    organizationTypes: [OrganizationType.SCHOOL, OrganizationType.DEPARTMENT],
    organizationHierarchy: true,
    studentCount: 5000,
    teacherCount: 300,
    adminCount: 25,
    classCount: 400,
    subjectsPerClass: NAME_POOLS.subjects,
    gradeLevels: ['Freshman', 'Sophomore', 'Junior', 'Senior'],
    academicYears: ['2024-2025'],
    terms: ['Fall', 'Spring', 'Summer'],
    enrollmentDistribution: { averageClassSize: 35, minClassSize: 15, maxClassSize: 150 },
    includeInactiveUsers: true,
    includeDroppedEnrollments: true,
    realEmailDomains: NAME_POOLS.emailDomains.educational,
    nameListSize: 'large'
  }
};

/**
 * Main mock data generator class
 */
export class MockDataGenerator {
  private usedEmails = new Set<string>();
  private usedUsernames = new Set<string>();
  
  /**
   * Generate a complete data set for a specific scenario
   */
  generateScenarioData(scenario: MockDataScenario, customConfig?: Partial<MockDataConfig>): MockDataSet {
    const config = { ...SCENARIO_CONFIGS[scenario], ...customConfig };
    
    console.log(`🎭 Generating mock data for scenario: ${scenario}`);
    console.log(`📊 Configuration:`, {
      organizations: config.organizationCount,
      students: config.studentCount,
      teachers: config.teacherCount,
      classes: config.classCount
    });
    
    // Reset state
    this.usedEmails.clear();
    this.usedUsernames.clear();
    
    // Generate entities in dependency order
    const organizations = this.generateOrganizations(config);
    const users = this.generateUsers(config, organizations);
    const classes = this.generateClasses(config, organizations, users);
    const enrollments = this.generateEnrollments(config, users, classes);
    
    const dataSet: MockDataSet = {
      organizations,
      users,
      classes,
      enrollments,
      metadata: {
        scenario,
        generatedAt: new Date(),
        totalEntities: organizations.length + users.length + classes.length + enrollments.length,
        relationships: {
          orgHierarchy: organizations.filter(org => org.parent_id).length,
          teacherClassAssignments: classes.length,
          studentEnrollments: enrollments.length
        }
      }
    };
    
    console.log(`✅ Generated ${dataSet.metadata.totalEntities} entities with ${dataSet.metadata.relationships.studentEnrollments} enrollments`);
    
    return dataSet;
  }

  /**
   * Generate realistic organizations with hierarchy
   */
  private generateOrganizations(config: MockDataConfig): Organization[] {
    const organizations: Organization[] = [];
    const now = new Date();
    
    if (config.organizationHierarchy && config.organizationTypes.includes(OrganizationType.DISTRICT)) {
      // Create district first
      const district: Organization = {
        id: uuidv4(),
        name: this.randomChoice(NAME_POOLS.organizationNames.districts),
        slug: this.generateSlug('district'),
        type: OrganizationType.DISTRICT,
        parent_id: null,
        billing_email: this.generateEmail('admin', 'district.k12.us'),
        is_active: true,
        subscription_plan: 'enterprise',
        created_at: now,
        updated_at: now,
        timeback_org_id: `ext-district-${organizations.length + 1}`,
        timeback_synced_at: now,
        timeback_sync_status: 'SYNCED',
        timeback_sync_version: 1
      };
      organizations.push(district);
      
      // Create schools under the district
      const schoolCount = config.organizationCount - 1;
      for (let i = 0; i < schoolCount; i++) {
        const school: Organization = {
          id: uuidv4(),
          name: this.randomChoice(NAME_POOLS.organizationNames.schools),
          slug: this.generateSlug('school', i),
          type: OrganizationType.SCHOOL,
          parent_id: district.id,
          billing_email: this.generateEmail('admin', 'school.edu'),
          is_active: true,
          subscription_plan: 'standard',
          created_at: now,
          updated_at: now,
          timeback_org_id: `ext-school-${i + 1}`,
          timeback_synced_at: now,
          timeback_sync_status: 'SYNCED',
          timeback_sync_version: 1
        };
        organizations.push(school);
      }
    } else {
      // Create independent organizations
      for (let i = 0; i < config.organizationCount; i++) {
        const orgType = this.randomChoice(config.organizationTypes);
        let namePool: string[];
        
        switch (orgType) {
          case OrganizationType.DISTRICT:
            namePool = NAME_POOLS.organizationNames.districts;
            break;
          case OrganizationType.SCHOOL:
            namePool = NAME_POOLS.organizationNames.schools;
            break;
          case OrganizationType.DEPARTMENT:
            namePool = NAME_POOLS.organizationNames.universities;
            break;
          default:
            namePool = NAME_POOLS.organizationNames.schools;
        }
        
        const organization: Organization = {
          id: uuidv4(),
          name: this.randomChoice(namePool),
          slug: this.generateSlug(orgType.toLowerCase(), i),
          type: orgType,
          parent_id: null,
          billing_email: this.generateEmail('admin', this.randomChoice(config.realEmailDomains)),
          is_active: true,
          subscription_plan: 'standard',
          created_at: now,
          updated_at: now,
          timeback_org_id: `ext-${orgType.toLowerCase()}-${i + 1}`,
          timeback_synced_at: now,
          timeback_sync_status: 'SYNCED',
          timeback_sync_version: 1
        };
        organizations.push(organization);
      }
    }
    
    return organizations;
  }

  /**
   * Generate realistic users (students, teachers, admins)
   */
  private generateUsers(config: MockDataConfig, organizations: Organization[]): User[] {
    const users: User[] = [];
    const now = new Date();
    
    // Generate admins
    for (let i = 0; i < config.adminCount; i++) {
      const firstName = this.randomChoice([...NAME_POOLS.firstNames.common, ...NAME_POOLS.firstNames.diverse]);
      const lastName = this.randomChoice([...NAME_POOLS.lastNames.common, ...NAME_POOLS.lastNames.international]);
      
      const admin: User = {
        id: uuidv4(),
        clerk_id: `clerk_admin_${i + 1}`,
        email: this.generateEmail(`${firstName.toLowerCase()}.${lastName.toLowerCase()}`, this.randomChoice(config.realEmailDomains)),
        first_name: firstName,
        last_name: lastName,
        username: this.generateUsername(firstName, lastName),
        avatar_url: null,
        role: UserRole.ADMIN,
        is_active: config.includeInactiveUsers ? Math.random() > 0.05 : true, // 5% inactive if enabled
        last_login_at: this.randomRecentDate(),
        created_at: now,
        updated_at: now,
        timeback_user_id: `ext-admin-${i + 1}`,
        timeback_synced_at: now,
        timeback_sync_status: 'SYNCED',
        timeback_sync_version: 1
      };
      users.push(admin);
    }
    
    // Generate teachers
    for (let i = 0; i < config.teacherCount; i++) {
      const firstName = this.randomChoice([...NAME_POOLS.firstNames.common, ...NAME_POOLS.firstNames.diverse]);
      const lastName = this.randomChoice([...NAME_POOLS.lastNames.common, ...NAME_POOLS.lastNames.international]);
      
      const teacher: User = {
        id: uuidv4(),
        clerk_id: `clerk_teacher_${i + 1}`,
        email: this.generateEmail(`${firstName.toLowerCase()}.${lastName.toLowerCase()}`, this.randomChoice(config.realEmailDomains)),
        first_name: firstName,
        last_name: lastName,
        username: this.generateUsername(firstName, lastName),
        avatar_url: null,
        role: UserRole.TEACHER,
        is_active: config.includeInactiveUsers ? Math.random() > 0.03 : true, // 3% inactive if enabled
        last_login_at: this.randomRecentDate(),
        created_at: now,
        updated_at: now,
        timeback_user_id: `ext-teacher-${i + 1}`,
        timeback_synced_at: now,
        timeback_sync_status: 'SYNCED',
        timeback_sync_version: 1
      };
      users.push(teacher);
    }
    
    // Generate students
    for (let i = 0; i < config.studentCount; i++) {
      const firstName = this.randomChoice([...NAME_POOLS.firstNames.common, ...NAME_POOLS.firstNames.diverse]);
      const lastName = this.randomChoice([...NAME_POOLS.lastNames.common, ...NAME_POOLS.lastNames.international]);
      
      const student: User = {
        id: uuidv4(),
        clerk_id: `clerk_student_${i + 1}`,
        email: this.generateEmail(`${firstName.toLowerCase()}.${lastName.toLowerCase()}`, this.randomChoice([...config.realEmailDomains, ...NAME_POOLS.emailDomains.personal])),
        first_name: firstName,
        last_name: lastName,
        username: this.generateUsername(firstName, lastName),
        avatar_url: null,
        role: UserRole.STUDENT,
        is_active: config.includeInactiveUsers ? Math.random() > 0.02 : true, // 2% inactive if enabled
        last_login_at: this.randomRecentDate(),
        created_at: now,
        updated_at: now,
        timeback_user_id: `ext-student-${i + 1}`,
        timeback_synced_at: now,
        timeback_sync_status: 'SYNCED',
        timeback_sync_version: 1
      };
      users.push(student);
    }
    
    return users;
  }

  /**
   * Generate realistic classes with proper teacher assignments
   */
  private generateClasses(config: MockDataConfig, organizations: Organization[], users: User[]): Class[] {
    const classes: Class[] = [];
    const now = new Date();
    const teachers = users.filter(user => user.role === UserRole.TEACHER);
    const schools = organizations.filter(org => org.type === OrganizationType.SCHOOL || 
      (org.type === OrganizationType.DISTRICT && organizations.length === 1));
    
    for (let i = 0; i < config.classCount; i++) {
      const teacher = this.randomChoice(teachers);
      const school = this.randomChoice(schools);
      const subject = this.randomChoice(config.subjectsPerClass);
      const gradeLevel = this.randomChoice(config.gradeLevels);
      const term = this.randomChoice(config.terms);
      const academicYear = this.randomChoice(config.academicYears);
      
      const classEntity: Class = {
        id: uuidv4(),
        name: `${subject} - ${gradeLevel}${term ? ` (${term})` : ''}`,
        description: `${subject} class for grade ${gradeLevel} students`,
        subject: subject,
        grade_level: gradeLevel,
        academic_year: academicYear,
        term: term,
        max_students: Math.floor(Math.random() * (config.enrollmentDistribution.maxClassSize - config.enrollmentDistribution.minClassSize + 1)) + config.enrollmentDistribution.minClassSize,
        is_active: true,
        created_at: now,
        updated_at: now,
        organization_id: school.id,
        teacher_id: teacher.id,
        timeback_class_id: `ext-class-${i + 1}`,
        timeback_synced_at: now,
        timeback_sync_status: 'SYNCED',
        timeback_sync_version: 1
      };
      classes.push(classEntity);
    }
    
    return classes;
  }

  /**
   * Generate realistic enrollments with proper distributions
   */
  private generateEnrollments(config: MockDataConfig, users: User[], classes: Class[]): Enrollment[] {
    const enrollments: Enrollment[] = [];
    const now = new Date();
    const students = users.filter(user => user.role === UserRole.STUDENT);
    
    for (const classEntity of classes) {
      // Determine class size within configured range
      const targetSize = Math.min(
        Math.floor(Math.random() * (config.enrollmentDistribution.maxClassSize - config.enrollmentDistribution.minClassSize + 1)) + config.enrollmentDistribution.minClassSize,
        students.length
      );
      
      // Randomly select students for this class
      const shuffledStudents = [...students].sort(() => Math.random() - 0.5);
      const selectedStudents = shuffledStudents.slice(0, targetSize);
      
      for (let i = 0; i < selectedStudents.length; i++) {
        const student = selectedStudents[i];
        
        // Determine enrollment status
        let status = EnrollmentStatus.ACTIVE;
        let completedAt: Date | null = null;
        let droppedAt: Date | null = null;
        let finalGrade: string | null = null;
        
        if (config.includeDroppedEnrollments) {
          const rand = Math.random();
          if (rand < 0.02) { // 2% dropped
            status = EnrollmentStatus.DROPPED;
            droppedAt = this.randomPastDate();
          } else if (rand < 0.05) { // 3% completed
            status = EnrollmentStatus.COMPLETED;
            completedAt = this.randomPastDate();
            finalGrade = this.randomChoice(['A', 'B', 'C', 'D']);
          } else if (rand < 0.08) { // 3% pending
            status = EnrollmentStatus.PENDING;
          }
        }
        
        const enrollment: Enrollment = {
          id: uuidv4(),
          enrollment_status: status,
          enrolled_at: this.randomPastDate(),
          completed_at: completedAt,
          dropped_at: droppedAt,
          final_grade: finalGrade,
          created_at: now,
          updated_at: now,
          user_id: student.id,
          class_id: classEntity.id
        };
        enrollments.push(enrollment);
      }
    }
    
    return enrollments;
  }

  // ================================================================
  // HELPER METHODS
  // ================================================================

  private randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private generateEmail(username: string, domain: string): string {
    let email = `${username}@${domain}`.toLowerCase();
    let counter = 1;
    
    while (this.usedEmails.has(email)) {
      email = `${username}${counter}@${domain}`.toLowerCase();
      counter++;
    }
    
    this.usedEmails.add(email);
    return email;
  }

  private generateUsername(firstName: string, lastName: string): string {
    let username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
    let counter = 1;
    
    while (this.usedUsernames.has(username)) {
      username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${counter}`;
      counter++;
    }
    
    this.usedUsernames.add(username);
    return username;
  }

  private generateSlug(prefix: string, index?: number): string {
    const timestamp = Date.now();
    const indexSuffix = index !== undefined ? `-${index}` : '';
    return `${prefix}-${timestamp}${indexSuffix}`.toLowerCase();
  }

  private randomRecentDate(): Date {
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    return new Date(thirtyDaysAgo + Math.random() * (now - thirtyDaysAgo));
  }

  private randomPastDate(): Date {
    const now = Date.now();
    const sixMonthsAgo = now - (180 * 24 * 60 * 60 * 1000);
    return new Date(sixMonthsAgo + Math.random() * (now - sixMonthsAgo));
  }
}
