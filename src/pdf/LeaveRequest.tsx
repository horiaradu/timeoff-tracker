import fs from 'node:fs'
import path from 'node:path'
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from '@react-pdf/renderer'
import { formatRomanian, type DateOnly } from '@/lib/dates'

/**
 * Caladea is metric-compatible with the Cambria used by the paper template.
 * The two reads are spelled out with literal paths so the deployment's file
 * tracer keeps the TTFs next to the bundled route handler.
 */
const regular = fs.readFileSync(path.join(process.cwd(), 'src/pdf/fonts/Caladea-Regular.ttf'))
const bold = fs.readFileSync(path.join(process.cwd(), 'src/pdf/fonts/Caladea-Bold.ttf'))

function fontSource(bytes: Buffer): string {
  return `data:font/ttf;base64,${bytes.toString('base64')}`
}

Font.register({
  family: 'Caladea',
  fonts: [
    { src: fontSource(regular), fontWeight: 'normal' },
    { src: fontSource(bold), fontWeight: 'bold' },
  ],
})

/** The template breaks lines on whole words only. */
Font.registerHyphenationCallback((word) => [word])

export type LeaveRequestProfile = {
  fullName: string
  ciSeries: string
  ciNumber: string
  cnp: string
  city: string
  jobTitle: string
  signaturePng: string | null
}

export type LeaveRequestPeriod = {
  startDate: DateOnly
  endDate: DateOnly
  requestDate: DateOnly
}

export type LeaveRequestProps = {
  profile: LeaveRequestProfile
  timeoff: LeaveRequestPeriod
}

/** A single day when the leave starts and ends on the same date. */
function period(start: DateOnly, end: DateOnly): string {
  return start === end ? formatRomanian(start) : `${formatRomanian(start)} - ${formatRomanian(end)}`
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 72,
    paddingBottom: 72,
    paddingHorizontal: 90,
    fontFamily: 'Caladea',
    fontSize: 12,
    lineHeight: 1.35,
    color: '#000000',
  },
  title: {
    marginTop: 148,
    fontSize: 14,
    textAlign: 'center',
  },
  body: {
    marginTop: 55,
    textAlign: 'justify',
    textIndent: 36,
  },
  thanks: {
    marginTop: 16,
    textAlign: 'right',
  },
  signatureRow: {
    marginTop: 95,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signedBy: {
    alignItems: 'flex-end',
  },
  signature: {
    width: 90,
    height: 45,
    objectFit: 'contain',
  },
  requestDate: {
    marginTop: 10,
  },
  approval: {
    marginTop: 64,
  },
})

/** The finished request, ready to stream back as a download. */
export function renderLeaveRequest(props: LeaveRequestProps): Promise<Buffer> {
  return renderToBuffer(<LeaveRequest {...props} />)
}

function LeaveRequest({ profile, timeoff }: LeaveRequestProps) {
  return (
    <Document title="Cerere concediu de odihna" author={profile.fullName}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>CATRE SC SMILECLOUD SRL,</Text>

        <Text style={styles.body}>
          Subsemnatul, {profile.fullName}, avand CI cu seria {profile.ciSeries}, numarul{' '}
          {profile.ciNumber}, CNP {profile.cnp}, domiciliat in localitatea {profile.city}, angajat
          al SC SMILECLOUD SRL in functia de {profile.jobTitle} solicit concediu de odihna in
          data/perioada de {period(timeoff.startDate, timeoff.endDate)}
        </Text>

        <Text style={styles.thanks}>Va multumesc,</Text>

        <View style={styles.signatureRow}>
          <View>
            <Text>{profile.city}</Text>
            <Text style={styles.requestDate}>Data: {formatRomanian(timeoff.requestDate)}</Text>
          </View>
          <View style={styles.signedBy}>
            <Text>{profile.fullName}</Text>
            {profile.signaturePng ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- a PDF image, not an <img>
              <Image src={profile.signaturePng} style={styles.signature} />
            ) : null}
          </View>
        </View>

        <Text style={styles.approval}>Aprobat administrator:</Text>
      </Page>
    </Document>
  )
}
