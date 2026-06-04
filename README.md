# SubnetMaster - Network Planning Suite

SubnetMaster is a professional-grade IPv4/IPv6 Subnet Calculator and Network Planning Tool designed for network engineers, NOC engineers, and cybersecurity professionals. It is available both as a web application and a Node.js Command Line Interface (CLI).

## Features

*   **IPv4 Subnet Calculator**: Network address, broadcast, usable hosts, and wildcard mask.
*   **CIDR Toolkit**: Bi-directional conversions and host capacity calculation.
*   **VLSM Planner**: Variable Length Subnet Masking allocation.
*   **Subnet Splitting**: Divide networks into smaller equal-sized subnets.
*   **Supernetting**: Aggregate multiple networks into the smallest possible supernet.
*   **Route Summarization**: Summarize routes with binary bit-matching analysis.
*   **Overlap Detection**: Check a list of subnets for overlaps or conflicts.
*   **IPv6 Toolkit**: Validation, compression, expansion, and type identification.
*   **Growth Planner**: Project future IP needs based on growth rates.
*   **Binary Visualization**: View IPs and masks at the binary level.
*   **Subnet Tree (CLI)**: Visualize subnet divisions as an ASCII tree.
*   **Interactive Quiz & Practice Lab**: Test your subnetting knowledge.
*   **Data Management**: Save history and favorites. Export data to JSON/CSV.

## Architecture

The project is structured into three main directories:

*   `core/`: Contains the pure, reusable networking math and logic modules (`ip-utils.js`, `ipv6-utils.js`, `rfc-data.js`).
*   `web/`: The Progressive Web App (PWA) client.
*   `cli/`: The Node.js command-line interface.

## Web Application

The web application is a fully client-side SPA (Single Page Application) built with HTML, CSS (Vanilla), and JavaScript. It features a modern, responsive design with dark mode, and PWA support for offline usage.

To run the web app locally:

1.  Navigate to the project root.
2.  Serve the `web` directory (e.g., `npx serve ./web`).
3.  Open the provided localhost URL in your browser.

## CLI Installation & Usage

The CLI provides all the powerful features of SubnetMaster directly in your terminal.

### Installation

To install the CLI globally via NPM (from the project root):

```bash
npm install -g .
```

*Note: Ensure you have Node.js installed.*

### CLI Commands

Once installed, you can use the `subnetmaster` command from anywhere.

#### Core Tools
*   `subnetmaster calc <ip/cidr>` - Calculate subnet details.
*   `subnetmaster cidr <value>` - Convert between CIDR and Subnet Mask.
*   `subnetmaster binary <ip/cidr>` - Display binary representation.

#### Planning & Routing
*   `subnetmaster split <network> <count>` - Split a network.
*   `subnetmaster vlsm <network> <hosts...>` - Allocate subnets using VLSM.
*   `subnetmaster supernet <networks...>` - Aggregate into a supernet.
*   `subnetmaster summarize <networks...>` - Summarize routes (with binary analysis).
*   `subnetmaster overlap <subnets...>` - Detect overlapping subnets.
*   `subnetmaster growth <currentHosts> <growthPercent>` - Network Growth Planner.
*   `subnetmaster tree <network>` - Visualize subnet divisions as an ASCII tree.

#### IPv6
*   `subnetmaster ipv6 <address>` - Analyze IPv6 addresses.

#### Learning
*   `subnetmaster quiz` - Take an interactive subnetting quiz.
*   `subnetmaster practice [difficulty]` - Practice calculating subnet details (easy, medium, hard).

#### Data
*   `subnetmaster history` - View calculation history.
*   `subnetmaster favorites` - Manage saved favorite networks.
*   `subnetmaster export` - Export data to JSON or CSV.

### CLI Examples

**Calculate a subnet:**
```bash
subnetmaster calc 192.168.1.0/24
```

**Plan a VLSM allocation (Network: 10.0.0.0/24, Departments needing 100, 50, and 20 hosts):**
```bash
subnetmaster vlsm 10.0.0.0/24 100 50 20
```

**Summarize multiple routes:**
```bash
subnetmaster summarize 192.168.0.0/24 192.168.1.0/24
```

**Take the interactive quiz:**
```bash
subnetmaster quiz
```

## Technologies Used

*   **Web**: HTML5, CSS3, Vanilla JavaScript, Chart.js (CDN).
*   **CLI**: Node.js, Commander.js, Chalk, CLI-Table3, Inquirer.

## License

ISC License.
