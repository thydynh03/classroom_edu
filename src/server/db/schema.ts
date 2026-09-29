import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  bigint,
} from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";

const id = () =>
  uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7());
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const userRole = pgEnum("user_role", ["ADMIN", "TEACHER", "STUDENT"]);
export const userStatus = pgEnum("user_status", ["ACTIVE", "LOCKED", "DISABLED"]);
export const classColor = pgEnum("class_color", [
  "sky",
  "mint",
  "peach",
  "lilac",
  "butter",
  "rose",
]);
export const classStatus = pgEnum("class_status", ["ACTIVE", "ARCHIVED"]);
export const memberRole = pgEnum("member_role", ["TEACHER", "STUDENT"]);
export const memberStatus = pgEnum("member_status", ["ACTIVE", "REMOVED"]);
export const assignmentType = pgEnum("assignment_type", ["WRITTEN", "QUIZ"]);
export const assignmentStatus = pgEnum("assignment_status", [
  "DRAFT",
  "SCHEDULED",
  "PUBLISHED",
  "ARCHIVED",
]);
export const showResults = pgEnum("show_results", ["IMMEDIATE", "AFTER_DUE", "MANUAL"]);
export const submissionStatus = pgEnum("submission_status", [
  "DRAFT",
  "SUBMITTED",
  "GRADED",
  "RETURNED",
]);
export const questionType = pgEnum("question_type", ["SINGLE", "MULTI", "TRUE_FALSE"]);
export const fileStatus = pgEnum("file_status", ["PENDING", "READY", "INFECTED", "DELETED"]);
export const filePurpose = pgEnum("file_purpose", ["ATTACHMENT", "SUBMISSION"]);
export const gradeAction = pgEnum("grade_action", ["GRADED", "EDITED", "RETURNED", "AUTO"]);
export const tokenPurpose = pgEnum("token_purpose", ["VERIFY_EMAIL", "RESET_PASSWORD"]);

export const users = pgTable(
  "users",
  {
    id: id(),
    username: text("username").notNull(),
    email: text("email"),
    fullName: text("full_name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRole("role").notNull(),
    status: userStatus("status").notNull().default("ACTIVE"),
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    failedLogins: integer("failed_logins").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    /** GV: null = đang chờ admin duyệt (tự đăng ký). Role khác không dùng. */
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    /** Đã xem xong (hoặc bỏ qua) hướng dẫn lần đầu đăng nhập */
    tourCompletedAt: timestamp("tour_completed_at", { withTimezone: true }),
    createdBy: uuid("created_by"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("users_username_uq").on(sql`lower(${t.username})`),
    uniqueIndex("users_email_uq").on(sql`lower(${t.email})`),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    userAgent: text("user_agent"),
    ip: text("ip"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("sessions_token_uq").on(t.tokenHash), index("sessions_user_idx").on(t.userId)],
);

export const authTokens = pgTable(
  "auth_tokens",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: tokenPurpose("purpose").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("auth_tokens_hash_uq").on(t.tokenHash)],
);

export const classes = pgTable(
  "classes",
  {
    id: id(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    subject: text("subject").notNull(),
    schoolYear: text("school_year"),
    color: classColor("color").notNull().default("sky"),
    joinCode: text("join_code").notNull(),
    joinEnabled: boolean("join_enabled").notNull().default(true),
    status: classStatus("status").notNull().default("ACTIVE"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("classes_join_code_uq").on(t.joinCode), index("classes_owner_idx").on(t.ownerId)],
);

export const classMembers = pgTable(
  "class_members",
  {
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRole("role").notNull(),
    status: memberStatus("status").notNull().default("ACTIVE"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.classId, t.userId] }),
    index("class_members_user_idx").on(t.userId, t.status),
  ],
);

export const assignments = pgTable(
  "assignments",
  {
    id: id(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    groupId: uuid("group_id").notNull(),
    type: assignmentType("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    maxPoints: numeric("max_points", { precision: 6, scale: 2, mode: "number" })
      .notNull()
      .default(10),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    allowLate: boolean("allow_late").notNull().default(true),
    allowResubmit: boolean("allow_resubmit").notNull().default(true),
    showResults: showResults("show_results").notNull().default("IMMEDIATE"),
    status: assignmentStatus("status").notNull().default("DRAFT"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    /** Thời điểm tự đăng khi status = SCHEDULED */
    publishAt: timestamp("publish_at", { withTimezone: true }),
    dueSoonNotifiedAt: timestamp("due_soon_notified_at", { withTimezone: true }),
    overdueNotifiedAt: timestamp("overdue_notified_at", { withTimezone: true }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("assignments_class_idx").on(t.classId, t.status, t.dueAt)],
);

export const files = pgTable("files", {
  id: id(),
  uploaderId: uuid("uploader_id")
    .notNull()
    .references(() => users.id),
  purpose: filePurpose("purpose").notNull(),
  classId: uuid("class_id")
    .notNull()
    .references(() => classes.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull().unique(),
  originalName: text("original_name").notNull(),
  mime: text("mime").notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
  status: fileStatus("status").notNull().default("PENDING"),
  createdAt: createdAt(),
});

export const assignmentAttachments = pgTable(
  "assignment_attachments",
  {
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.assignmentId, t.fileId] })],
);

export const questions = pgTable(
  "questions",
  {
    id: id(),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    type: questionType("type").notNull(),
    prompt: text("prompt").notNull(),
    points: numeric("points", { precision: 6, scale: 2, mode: "number" }).notNull().default(1),
    position: integer("position").notNull(),
  },
  (t) => [index("questions_assignment_idx").on(t.assignmentId, t.position)],
);

export const questionOptions = pgTable("question_options", {
  id: id(),
  questionId: uuid("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  isCorrect: boolean("is_correct").notNull().default(false),
  position: integer("position").notNull(),
});

export type QuizAnswers = Record<string, string[]>;

export const submissions = pgTable(
  "submissions",
  {
    id: id(),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id),
    status: submissionStatus("status").notNull().default("DRAFT"),
    content: text("content").notNull().default(""),
    quizAnswers: jsonb("quiz_answers").$type<QuizAnswers>(),
    isLate: boolean("is_late").notNull().default(false),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    score: numeric("score", { precision: 6, scale: 2, mode: "number" }),
    feedback: text("feedback"),
    returnedAt: timestamp("returned_at", { withTimezone: true }),
    versionNo: integer("version_no").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("submissions_assignment_student_uq").on(t.assignmentId, t.studentId),
    index("submissions_assignment_status_idx").on(t.assignmentId, t.status),
    index("submissions_student_status_idx").on(t.studentId, t.status),
  ],
);

export const submissionFiles = pgTable(
  "submission_files",
  {
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.submissionId, t.fileId] })],
);

export const gradeEvents = pgTable(
  "grade_events",
  {
    id: id(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    graderId: uuid("grader_id").references(() => users.id),
    score: numeric("score", { precision: 6, scale: 2, mode: "number" }),
    feedback: text("feedback"),
    action: gradeAction("action").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("grade_events_submission_idx").on(t.submissionId, t.createdAt)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    href: text("href").notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    emailSentAt: timestamp("email_sent_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("notifications_dedupe_uq").on(t.dedupeKey),
    index("notifications_recipient_idx").on(t.recipientId, t.readAt, t.createdAt),
  ],
);

export const auditLogs = pgTable("audit_logs", {
  id: id(),
  actorId: uuid("actor_id").references(() => users.id),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id"),
  meta: jsonb("meta").$type<Record<string, unknown>>(),
  createdAt: createdAt(),
});

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(classMembers),
}));
export const classesRelations = relations(classes, ({ many, one }) => ({
  members: many(classMembers),
  assignments: many(assignments),
  owner: one(users, { fields: [classes.ownerId], references: [users.id] }),
}));
export const classMembersRelations = relations(classMembers, ({ one }) => ({
  class: one(classes, { fields: [classMembers.classId], references: [classes.id] }),
  user: one(users, { fields: [classMembers.userId], references: [users.id] }),
}));
export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  class: one(classes, { fields: [assignments.classId], references: [classes.id] }),
  submissions: many(submissions),
  questions: many(questions),
  attachments: many(assignmentAttachments),
}));
export const assignmentAttachmentsRelations = relations(assignmentAttachments, ({ one }) => ({
  assignment: one(assignments, {
    fields: [assignmentAttachments.assignmentId],
    references: [assignments.id],
  }),
  file: one(files, { fields: [assignmentAttachments.fileId], references: [files.id] }),
}));
export const questionsRelations = relations(questions, ({ one, many }) => ({
  assignment: one(assignments, { fields: [questions.assignmentId], references: [assignments.id] }),
  options: many(questionOptions),
}));
export const questionOptionsRelations = relations(questionOptions, ({ one }) => ({
  question: one(questions, { fields: [questionOptions.questionId], references: [questions.id] }),
}));
export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  assignment: one(assignments, {
    fields: [submissions.assignmentId],
    references: [assignments.id],
  }),
  student: one(users, { fields: [submissions.studentId], references: [users.id] }),
  files: many(submissionFiles),
  events: many(gradeEvents),
}));
export const submissionFilesRelations = relations(submissionFiles, ({ one }) => ({
  submission: one(submissions, {
    fields: [submissionFiles.submissionId],
    references: [submissions.id],
  }),
  file: one(files, { fields: [submissionFiles.fileId], references: [files.id] }),
}));
export const gradeEventsRelations = relations(gradeEvents, ({ one }) => ({
  submission: one(submissions, {
    fields: [gradeEvents.submissionId],
    references: [submissions.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type ClassRow = typeof classes.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type ClassColor = (typeof classColor.enumValues)[number];
