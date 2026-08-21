// Attendee check-in state, shared across the original (sync) and
// pivoted (async) implementations. The pivot adds a PENDING state that
// didn't exist before — the sync model could go straight from
// NOT_CHECKED_IN to CHECKED_IN because it waited for the print result
// before ever telling the UI anything succeeded.

export type AttendeeStatus = "NOT_CHECKED_IN" | "PENDING" | "CHECKED_IN";

export interface AttendeeRecord {
  attendeeId: string;
  status: AttendeeStatus;
  jobId?: string; // set while PENDING, used to correlate the eventual webhook confirmation
}

export class AttendeeStore {
  private records = new Map<string, AttendeeRecord>();

  private getOrCreate(attendeeId: string): AttendeeRecord {
    let record = this.records.get(attendeeId);
    if (!record) {
      record = { attendeeId, status: "NOT_CHECKED_IN" };
      this.records.set(attendeeId, record);
    }
    return record;
  }

  getStatus(attendeeId: string): AttendeeStatus {
    return this.getOrCreate(attendeeId).status;
  }

  getRecord(attendeeId: string): AttendeeRecord {
    return this.getOrCreate(attendeeId);
  }

  markCheckedIn(attendeeId: string): void {
    const record = this.getOrCreate(attendeeId);
    record.status = "CHECKED_IN";
    record.jobId = undefined;
  }

  markPending(attendeeId: string, jobId: string): void {
    const record = this.getOrCreate(attendeeId);
    record.status = "PENDING";
    record.jobId = jobId;
  }

  reset(attendeeId: string): void {
    this.records.set(attendeeId, { attendeeId, status: "NOT_CHECKED_IN" });
  }
}
