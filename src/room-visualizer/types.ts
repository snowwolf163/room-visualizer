export type Row = {
  courseSection: string;
  courseOfferingId: string;
  startDate: string;
  endDate: string;
  daysMet: string;
  startTime: string;
  endTime: string;
  instructor: string;
  room: string;
  maxEnrollment?: string | number;
  status?: string;
  term?: string;
};

export type SessionInstance = {
  date: Date;
  dayCode: string;
  start: Date;
  end: Date;
  instructor: string;
  courseSection: string;
  room: string;
  baseCourse: string;
  sections: string[];
  daysMet: string;
  startDate: string | number;
  endDate: string | number;
  term: string;
  status: string;
  courseOfferingIds: string[];
};

export type ValidationSchedRow = {
  row: Row;
  startDateObj: Date;
  endDateObj: Date;
  startTimeObj: Date;
  endTimeObj: Date;
  instructor: string;
  room: string;
  term: string;
  status: string;
  courseSection: string;
  daysMet: string;
};