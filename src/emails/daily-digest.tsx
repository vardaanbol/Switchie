import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export type DigestJob = {
  title: string;
  company: string;
  description: string;
  location?: string;
  salaryEstimateMin?: number;
  salaryEstimateMax?: number;
  salaryIsEstimate?: boolean;
  pros: string[];
  cons: string[];
  sourceUrl: string;
  matchScore: number;
  referralContacts: Array<{
    name: string;
    title: string;
    profileUrl: string;
  }>;
};

function formatInr(amount?: number) {
  if (typeof amount !== "number") return null;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function DailyDigestEmail({
  name,
  jobs,
  dashboardUrl,
}: {
  name: string;
  jobs: DigestJob[];
  dashboardUrl: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>{`${jobs.length} new job matches for you — Job Finder Agent`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Your daily job digest</Heading>
          <Text style={text}>Hi {name},</Text>
          <Text style={text}>
            Here are today&apos;s top matches curated for your profile (salaries in ₹).
          </Text>
          {jobs.map((job) => {
            const min = formatInr(job.salaryEstimateMin);
            const max = formatInr(job.salaryEstimateMax);
            const salary =
              min && max
                ? `${min} – ${max}${job.salaryIsEstimate ? " (estimate)" : ""}`
                : "Salary not listed";

            return (
              <Section key={job.sourceUrl} style={card}>
                <Heading as="h2" style={h2}>
                  {job.title}
                </Heading>
                <Text style={meta}>
                  {job.company}
                  {job.location ? ` · ${job.location}` : ""} · Match {job.matchScore}%
                </Text>
                <Text style={text}>{job.description}</Text>
                <Text style={text}>
                  <strong>Salary:</strong> {salary}
                </Text>
                {job.pros.length > 0 && (
                  <Text style={text}>
                    <strong>Pros:</strong> {job.pros.join(" · ")}
                  </Text>
                )}
                {job.cons.length > 0 && (
                  <Text style={text}>
                    <strong>Cons:</strong> {job.cons.join(" · ")}
                  </Text>
                )}
                {job.referralContacts.slice(0, 2).map((c) => (
                  <Text key={c.profileUrl} style={text}>
                    Referral:{" "}
                    <Link href={c.profileUrl}>
                      {c.name} — {c.title}
                    </Link>
                  </Text>
                ))}
                <Button style={button} href={job.sourceUrl}>
                  View listing
                </Button>
              </Section>
            );
          })}
          <Hr />
          <Text style={text}>
            Manage alerts in your{" "}
            <Link href={dashboardUrl}>dashboard</Link>.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f6f6",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "24px 16px",
  maxWidth: "560px",
};

const h1 = {
  fontSize: "24px",
  lineHeight: "1.3",
  fontWeight: "700" as const,
  color: "#111",
};

const h2 = {
  fontSize: "18px",
  margin: "0 0 4px",
  color: "#111",
};

const text = {
  fontSize: "14px",
  lineHeight: "1.5",
  color: "#333",
};

const meta = {
  fontSize: "13px",
  color: "#666",
  marginTop: "0",
};

const card = {
  backgroundColor: "#fff",
  borderRadius: "8px",
  padding: "16px",
  margin: "16px 0",
  border: "1px solid #e5e5e5",
};

const button = {
  backgroundColor: "#111",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "14px",
  fontWeight: "600" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "10px 16px",
  marginTop: "8px",
};

export default DailyDigestEmail;
